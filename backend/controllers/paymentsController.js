const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/db');

function getMoyasarAuthHeader() {
  const apiKey = process.env.MOYASAR_API_KEY || '';
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

exports.initiateGatewayPayment = async (req, res) => {
  const { order_id, payment_method } = req.body;
  const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!orders.length) return res.status(404).json({ message: 'الطلب غير موجود' });

  const order = orders[0];
  const amountHalala = Math.round(Number(order.total_price_sar) * 100);

  try {
    const payload = {
      amount: amountHalala,
      currency: 'SAR',
      description: `Order #${order_id}`,
      callback_url: `${process.env.FRONTEND_URL}/pages/order-detail.html?id=${order_id}`,
      source: { type: payment_method === 'apple_pay' ? 'applepay' : 'creditcard' },
      metadata: { order_id: String(order_id), payment_method },
    };

    const response = await axios.post('https://api.moyasar.com/v1/payments', payload, {
      headers: { Authorization: getMoyasarAuthHeader(), 'Content-Type': 'application/json' },
    });

    const payment = response.data;
    await pool.execute(
      'INSERT INTO order_payments (order_id, gateway, transaction_id, amount_sar, status, raw_response_json) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, 'moyasar', payment.id, order.total_price_sar, payment.status || 'pending', JSON.stringify(payment)]
    );

    res.json({ payment_url: payment.source?.transaction_url || payment.url || null, token: payment.id, gateway: 'moyasar' });
  } catch (error) {
    res.status(500).json({ message: 'فشل تهيئة الدفع', error: error.response?.data || error.message });
  }
};

exports.gatewayCallback = async (req, res) => {
  const data = req.body;
  const orderId = data.metadata?.order_id || data.order_id;
  if (!orderId) return res.status(400).json({ message: 'order_id مفقود' });

  const statusMap = { paid: 'paid', failed: 'failed', refunded: 'refunded' };
  const status = statusMap[data.status] || 'pending';

  await pool.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [status, orderId]);
  await pool.execute(
    `INSERT INTO order_payments (order_id, gateway, transaction_id, amount_sar, status, raw_response_json)
     VALUES (?, 'moyasar', ?, ?, ?, ?)`,
    [orderId, data.id || `cb-${Date.now()}`, Number(data.amount || 0) / 100, status, JSON.stringify(data)]
  );

  res.json({ message: 'تم استلام الإشعار' });
};

exports.createTamaraSession = async (req, res) => {
  const { order_id } = req.body;
  const [orders] = await pool.execute('SELECT o.*, u.name, u.email, u.phone FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?', [order_id]);
  if (!orders.length) return res.status(404).json({ message: 'الطلب غير موجود' });
  const order = orders[0];
  const [items] = await pool.execute(
    `SELECT oi.quantity, oi.unit_price_sar, p.name_ar FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
    [order_id]
  );

  const baseUrl = process.env.TAMARA_SANDBOX === 'true' ? 'https://api-sandbox.tamara.co' : 'https://api.tamara.co';
  const buyerName = order.name?.split(' ') || ['عميل', 'سوقي'];

  try {
    const payload = {
      order_reference_id: String(order_id),
      total_amount: { amount: Number(order.total_price_sar), currency: 'SAR' },
      description: `Souqi order #${order_id}`,
      country_code: 'SA',
      payment_type: 'PAY_BY_INSTALMENTS',
      instalments: 3,
      consumer: {
        first_name: buyerName[0],
        last_name: buyerName.slice(1).join(' ') || 'عميل',
        phone_number: order.phone,
        email: order.email,
      },
      items: items.map((item) => ({
        name: item.name_ar,
        quantity: item.quantity,
        unit_price: { amount: Number(item.unit_price_sar), currency: 'SAR' },
        total_amount: { amount: Number(item.unit_price_sar) * item.quantity, currency: 'SAR' },
      })),
      shipping_address: JSON.parse(order.shipping_address_json),
      billing_address: JSON.parse(order.shipping_address_json),
      merchant_url: {
        success: `${process.env.FRONTEND_URL}/pages/checkout.html?tamara=success&orderId=${order_id}`,
        failure: `${process.env.FRONTEND_URL}/pages/checkout.html?tamara=failure&orderId=${order_id}`,
        cancel: `${process.env.FRONTEND_URL}/pages/checkout.html?tamara=cancel&orderId=${order_id}`,
        notification: `${process.env.FRONTEND_URL}/api/payments/tamara/notification`,
      },
    };

    const response = await axios.post(`${baseUrl}/checkout`, payload, {
      headers: { Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}` },
    });

    const tamaraOrderId = response.data.order_id || response.data.order_reference_id || null;
    await pool.execute('UPDATE orders SET payment_method = ?, tamara_order_id = ? WHERE id = ?', ['tamara', tamaraOrderId, order_id]);
    await pool.execute(
      'INSERT INTO order_payments (order_id, gateway, transaction_id, amount_sar, status, raw_response_json) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, 'tamara', tamaraOrderId || `tamara-${order_id}`, order.total_price_sar, 'pending', JSON.stringify(response.data)]
    );

    res.json({ checkout_url: response.data.checkout_url, tamara_order_id: tamaraOrderId });
  } catch (error) {
    res.status(500).json({ message: 'فشل جلسة تمارا', error: error.response?.data || error.message });
  }
};

exports.tamaraNotification = async (req, res) => {
  const token = req.headers['x-notification-token'];
  if (token !== process.env.TAMARA_NOTIFICATION_TOKEN) return res.status(401).json({ message: 'Invalid token' });

  const status = req.body?.order_status || req.body?.status || 'pending';
  const orderId = req.body?.order_reference_id || req.body?.order_id;
  if (!orderId) return res.status(400).json({ message: 'order reference required' });

  const mapped = /(approved|captured|paid|authorised)/i.test(status) ? 'paid' : /(failed|canceled|cancelled)/i.test(status) ? 'failed' : 'pending';
  await pool.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [mapped, orderId]);
  res.json({ message: 'ok' });
};

exports.createTabbySession = async (req, res) => {
  const { order_id } = req.body;
  const [orders] = await pool.execute('SELECT o.*, u.name, u.email, u.phone, u.created_at as registered_since FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?', [order_id]);
  if (!orders.length) return res.status(404).json({ message: 'الطلب غير موجود' });

  const order = orders[0];
  const [items] = await pool.execute('SELECT oi.quantity, oi.unit_price_sar, p.name_ar FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?', [order_id]);
  const baseUrl = 'https://api.tabby.ai/api/v2';

  try {
    const payload = {
      payment: {
        amount: Number(order.total_price_sar).toFixed(2),
        currency: 'SAR',
        description: `Souqi order #${order_id}`,
        buyer: { email: order.email, phone: order.phone, name: order.name },
        buyer_history: { registered_since: new Date(order.registered_since).toISOString(), loyalty_level: 0 },
        order: {
          tax_amount: Number(order.vat_amount).toFixed(2),
          shipping_amount: '0.00',
          discount_amount: '0.00',
          updated_at: new Date().toISOString(),
          reference_id: String(order_id),
          items: items.map((item) => ({
            title: item.name_ar,
            quantity: item.quantity,
            unit_price: Number(item.unit_price_sar).toFixed(2),
            reference_id: `${order_id}-${item.name_ar}`,
          })),
        },
        shipping_address: JSON.parse(order.shipping_address_json),
      },
      lang: 'ar',
      merchant_code: process.env.TABBY_MERCHANT_CODE,
      merchant_urls: {
        success: `${process.env.FRONTEND_URL}/pages/checkout.html?tabby=success&orderId=${order_id}`,
        cancel: `${process.env.FRONTEND_URL}/pages/checkout.html?tabby=cancel&orderId=${order_id}`,
        failure: `${process.env.FRONTEND_URL}/pages/checkout.html?tabby=failure&orderId=${order_id}`,
      },
    };

    const response = await axios.post(`${baseUrl}/checkout`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    await pool.execute('UPDATE orders SET payment_method = ?, tabby_payment_id = ? WHERE id = ?', ['tabby', response.data.id, order_id]);
    await pool.execute(
      'INSERT INTO order_payments (order_id, gateway, transaction_id, amount_sar, status, raw_response_json) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, 'tabby', response.data.id, order.total_price_sar, 'pending', JSON.stringify(response.data)]
    );

    res.json({ id: response.data.id, configuration: response.data.configuration, web_url: response.data.configuration?.available_products?.installments?.[0]?.web_url || response.data.configuration?.url });
  } catch (error) {
    res.status(500).json({ message: 'فشل جلسة تابي', error: error.response?.data || error.message });
  }
};

exports.tabbyWebhook = async (req, res) => {
  const signature = req.headers['tabby-signature'];
  const body = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', process.env.TABBY_SECRET_KEY).update(body).digest('hex');
  if (signature !== expected) return res.status(401).json({ message: 'Invalid signature' });

  const eventType = req.body?.event || req.body?.type;
  const payment = req.body?.payment || {};
  const orderRef = payment?.order?.reference_id || req.body?.reference_id;
  if (!orderRef) return res.status(400).json({ message: 'missing order ref' });

  const isPaid = eventType === 'payment.approved' || eventType === 'payment.closed';
  await pool.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [isPaid ? 'paid' : 'pending', orderRef]);
  res.json({ message: 'ok' });
};

exports.setCOD = async (req, res) => {
  const { order_id } = req.body;
  const [rows] = await pool.execute('SELECT total_price_sar FROM orders WHERE id = ?', [order_id]);
  if (!rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });

  const fee = Number(process.env.COD_FEE_SAR || 15);
  await pool.execute('UPDATE orders SET payment_method=?, total_price_sar = total_price_sar + ? WHERE id = ?', ['cod', fee, order_id]);
  await pool.execute(
    'INSERT INTO order_payments (order_id, gateway, transaction_id, amount_sar, status, raw_response_json) VALUES (?, ?, ?, ?, ?, ?)',
    [order_id, 'cod', `cod-${order_id}`, Number(rows[0].total_price_sar) + fee, 'pending', JSON.stringify({ cod_fee: fee })]
  );
  res.json({ message: 'تم اختيار الدفع عند الاستلام', cod_fee_sar: fee });
};
