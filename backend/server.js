require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'souqi-backend' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/system', require('./routes/system'));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'حدث خطأ داخلي' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Souqi API running on port ${PORT}`);
});
