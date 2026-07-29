const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PRODUCTS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data/products-fallback.json'), 'utf8')
).products;

const MODE = process.env.PAYMENTS_MODE || 'mock';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};

  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 1_000_000) throw new Error('Payload too large');
  }
  return data ? JSON.parse(data) : {};
}

function requestBase(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const protocol = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8080';
  return `${protocol}://${host}`;
}

function makeOrderId() {
  return `SQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function buildItems(payload) {
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  return rawItems.map((line) => {
    const id = Number(line.id);
    const qty = Math.max(1, Math.min(20, Number(line.qty) || 1));
    const product = PRODUCTS.find((item) => item.id === id);
    return product ? { line: { id, qty }, product } : null;
  }).filter(Boolean);
}

function calculateOrder(payload) {
  const items = buildItems(payload);
  const subtotal = items.reduce((sum, { line, product }) => sum + Number(product.price) * line.qty, 0);
  const shipping = subtotal > 0 && subtotal < 150 ? 25 : 0;
  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number((subtotal + shipping).toFixed(2))
  };
}

async function createTabbySession(payload, orderId, baseUrl) {
  const secretKey = process.env.TABBY_SECRET_KEY;
  const merchantCode = process.env.TABBY_MERCHANT_CODE;
  if (!secretKey || !merchantCode) throw new Error('Tabby credentials are missing');

  const order = calculateOrder(payload);
  const amount = order.total.toFixed(2);
  const items = order.items.map(({ line, product }) => ({
    title: product.title,
    quantity: line.qty,
    unit_price: Number(product.price).toFixed(2),
    category: product.categoryAr
  }));

  const response = await fetch('https://api.tabby.ai/api/v2/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`
    },
    body: JSON.stringify({
      payment: {
        amount,
        currency: 'SAR',
        description: `Souqi order ${orderId}`,
        buyer: {
          phone: payload.customer.phone,
          email: payload.customer.email,
          name: payload.customer.name
        },
        shipping_address: {
          city: payload.customer.city,
          address: payload.customer.address,
          zip: ''
        },
        order: {
          tax_amount: '0.00',
          shipping_amount: order.shipping.toFixed(2),
          discount_amount: '0.00',
          updated_at: new Date().toISOString(),
          reference_id: orderId,
          items
        },
        buyer_history: {
          registered_since: new Date().toISOString(),
          loyalty_level: 0
        },
        order_history: []
      },
      lang: 'ar',
      merchant_code: merchantCode,
      merchant_urls: {
        success: `${baseUrl}/payment-result.html?status=success&order=${orderId}`,
        cancel: `${baseUrl}/payment-result.html?status=cancel&order=${orderId}`,
        failure: `${baseUrl}/payment-result.html?status=failure&order=${orderId}`
      }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Tabby checkout failed');
  return data.configuration?.available_products?.installments?.[0]?.web_url || data.web_url;
}

async function createTamaraSession(payload, orderId, baseUrl) {
  const token = process.env.TAMARA_API_TOKEN;
  if (!token) throw new Error('Tamara credentials are missing');

  const host = (process.env.TAMARA_SANDBOX || 'true') === 'true'
    ? 'https://api-sandbox.tamara.co'
    : 'https://api.tamara.co';

  const order = calculateOrder(payload);
  const items = order.items.map(({ line, product }) => ({
    reference_id: String(product.id),
    type: 'Physical',
    name: product.title,
    sku: `SQ-${product.id}`,
    quantity: line.qty,
    unit_price: { amount: Number(product.price).toFixed(2), currency: 'SAR' },
    total_amount: { amount: (Number(product.price) * line.qty).toFixed(2), currency: 'SAR' }
  }));

  const response = await fetch(`${host}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      order_reference_id: orderId,
      total_amount: { amount: order.total.toFixed(2), currency: 'SAR' },
      description: `Souqi order ${orderId}`,
      country_code: 'SA',
      payment_type: 'PAY_BY_INSTALMENTS',
      locale: 'ar_SA',
      items,
      consumer: {
        first_name: payload.customer.name,
        last_name: '',
        phone_number: payload.customer.phone,
        email: payload.customer.email
      },
      billing_address: {
        first_name: payload.customer.name,
        last_name: '',
        line1: payload.customer.address,
        city: payload.customer.city,
        country_code: 'SA'
      },
      shipping_address: {
        first_name: payload.customer.name,
        last_name: '',
        line1: payload.customer.address,
        city: payload.customer.city,
        country_code: 'SA'
      },
      merchant_url: {
        success: `${baseUrl}/payment-result.html?status=success&order=${orderId}`,
        failure: `${baseUrl}/payment-result.html?status=failure&order=${orderId}`,
        cancel: `${baseUrl}/payment-result.html?status=cancel&order=${orderId}`,
        notification: `${baseUrl}/api/webhooks/tamara`
      }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Tamara checkout failed');
  return data.checkout_url;
}


function moyasarConfig(baseUrl) {
  const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY || '';
  return {
    enabled: Boolean(publishableKey && process.env.MOYASAR_SECRET_KEY),
    publishableKey,
    callbackUrl: `${baseUrl}/payment-result.html`,
    currency: 'SAR',
    supportedMethods: ['mada', 'visa', 'apple-pay', 'stc-pay']
  };
}

async function verifyMoyasarPayment(paymentId) {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) throw new Error('Moyasar secret key is missing');
  if (!/^[A-Za-z0-9_-]+$/.test(paymentId || '')) throw new Error('Invalid payment id');
  const auth = Buffer.from(`${secret}:`).toString('base64');
  const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Moyasar verification failed');
  return {
    id: data.id,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    sourceType: data.source?.type || null,
    createdAt: data.created_at
  };
}

async function handleApi(req, res, url, baseUrl) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true, mode: MODE });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/products') {
    send(res, 200, { products: PRODUCTS, total: PRODUCTS.length, source: 'local-seed' });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/payment-methods') {
    send(res, 200, {
      mode: MODE,
      methods: ['mada', 'visa', 'apple-pay', 'stc-pay', 'tabby', 'tamara', 'cod']
    });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/payments/moyasar/config') {
    send(res, 200, { mode: MODE, ...moyasarConfig(baseUrl) });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/payments/moyasar/verify') {
    try {
      const paymentId = url.searchParams.get('paymentId');
      const payment = await verifyMoyasarPayment(paymentId);
      send(res, 200, { verified: payment.status === 'paid', payment });
    } catch (error) {
      send(res, 400, { verified: false, message: error.message });
    }
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/payments/session') {
    try {
      const payload = await readBody(req);
      const orderId = makeOrderId();
      const order = calculateOrder(payload);
      if (!order.items.length) {
        send(res, 400, { message: 'Cart is empty' });
        return true;
      }

      if (MODE !== 'live' || payload.method === 'cod') {
        send(res, 200, {
          mode: 'mock',
          orderId,
          status: 'approved',
          amount: order.total,
          currency: 'SAR',
          message: 'وضع المحاكاة مفعل. أضف مفاتيح التاجر وحوّل PAYMENTS_MODE إلى live للتشغيل الحقيقي.'
        });
        return true;
      }

      if (['mada', 'visa', 'apple-pay', 'stc-pay'].includes(payload.method)) {
        const config = moyasarConfig(baseUrl);
        if (!config.enabled) throw new Error('Moyasar credentials are missing');
        send(res, 200, {
          mode: 'moyasar',
          orderId,
          amountHalalas: Math.round(order.total * 100),
          currency: 'SAR',
          description: `Souqi order ${orderId}`,
          callbackUrl: `${baseUrl}/payment-result.html?provider=moyasar&order=${orderId}`,
          publishableKey: config.publishableKey,
          method: payload.method,
          message: 'Moyasar merchant configuration is available. Complete the client payment form and verify the returned payment ID on the server.'
        });
        return true;
      }

      if (payload.method === 'tabby') {
        const redirectUrl = await createTabbySession(payload, orderId, baseUrl);
        send(res, 200, { mode: 'live', orderId, redirectUrl });
        return true;
      }
      if (payload.method === 'tamara') {
        const redirectUrl = await createTamaraSession(payload, orderId, baseUrl);
        send(res, 200, { mode: 'live', orderId, redirectUrl });
        return true;
      }

      send(res, 400, { message: 'Unsupported method' });
      return true;
    } catch (error) {
      send(res, 500, { message: error.message });
      return true;
    }
  }
  if (req.method === 'POST' && url.pathname.startsWith('/api/webhooks/')) {
    send(res, 200, { received: true });
    return true;
  }
  return false;
}

function serveStatic(req, res, url) {
  const requestPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  let filePath = path.join(PUBLIC, requestPath);
  if (!filePath.startsWith(PUBLIC)) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) filePath = path.join(PUBLIC, 'index.html');
    fs.readFile(filePath, (readError, buffer) => {
      if (readError) {
        send(res, 500, 'Server error', 'text/plain; charset=utf-8');
        return;
      }
      send(res, 200, buffer, MIME[path.extname(filePath)] || 'application/octet-stream');
    });
  });
}

async function handler(req, res) {
  const baseUrl = requestBase(req);
  const url = new URL(req.url || '/', baseUrl);
  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, url, baseUrl);
    if (!handled) send(res, 404, { message: 'Not found' });
    return;
  }
  serveStatic(req, res, url);
}

module.exports = { handler };
