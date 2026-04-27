const pool = require('../config/db');
const { calculateVatInclusive } = require('../utils/vatCalculator');
const { generateInvoiceHTML } = require('../utils/invoiceGenerator');

exports.createOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [cartItems] = await conn.execute(
      `SELECT c.product_id, c.quantity, p.price_sar, p.stock_qty
       FROM cart c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`,
      [req.user.id]
    );
    if (!cartItems.length) return res.status(400).json({ message: 'السلة فارغة' });

    let total = 0;
    for (const item of cartItems) {
      if (item.quantity > item.stock_qty) return res.status(400).json({ message: 'مخزون غير كافٍ' });
      total += Number(item.price_sar) * item.quantity;
    }

    const codFee = req.body.payment_method === 'cod' ? Number(process.env.COD_FEE_SAR || 15) : 0;
    total += codFee;
    const { vat } = calculateVatInclusive(total);

    const [orderResult] = await conn.execute(
      `INSERT INTO orders
      (user_id, total_price_sar, vat_amount, payment_method, shipping_address_json)
      VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, total.toFixed(2), vat.toFixed(2), req.body.payment_method, JSON.stringify(req.body.shipping_address)]
    );

    for (const item of cartItems) {
      await conn.execute('INSERT INTO order_items (order_id, product_id, quantity, unit_price_sar) VALUES (?, ?, ?, ?)',
        [orderResult.insertId, item.product_id, item.quantity, item.price_sar]);
      await conn.execute('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await conn.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    await conn.commit();
    res.status(201).json({ order_id: orderResult.insertId, total_price_sar: total, vat_amount: vat });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'فشل إنشاء الطلب', error: e.message });
  } finally {
    conn.release();
  }
};

exports.getMyOrders = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json(rows);
};

exports.getOrderById = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
  if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'ممنوع' });
  }
  const [items] = await pool.execute(
    `SELECT oi.*, p.name_ar, p.image_url FROM order_items oi
    JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
    [req.params.id]
  );
  res.json({ ...rows[0], items });
};

exports.updateStatus = async (req, res) => {
  await pool.execute('UPDATE orders SET order_status = ? WHERE id = ?', [req.body.order_status, req.params.id]);
  res.json({ message: 'تم تحديث الحالة' });
};

exports.getInvoice = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
  const order = rows[0];

  const [items] = await pool.execute(
    `SELECT oi.*, p.name_ar FROM order_items oi
    JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
    [req.params.id]
  );

  const html = await generateInvoiceHTML(order, items);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};
