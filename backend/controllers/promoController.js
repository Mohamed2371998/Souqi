const pool = require('../config/db');

exports.apply = async (req, res) => {
  const { code, subtotal } = req.body;
  const [rows] = await pool.execute('SELECT * FROM promo_codes WHERE code = ? LIMIT 1', [code]);
  if (!rows.length) return res.status(404).json({ message: 'كود غير صالح' });

  const promo = rows[0];
  const now = new Date();
  if (promo.expires_at && new Date(promo.expires_at) < now) return res.status(400).json({ message: 'انتهت صلاحية الكود' });
  if (promo.usage_limit && promo.used_count >= promo.usage_limit) return res.status(400).json({ message: 'تم استهلاك الكود' });
  if (Number(subtotal) < Number(promo.min_order_sar)) return res.status(400).json({ message: 'الحد الأدنى غير متحقق' });

  const discount = promo.discount_type === 'percent'
    ? Number((subtotal * (promo.discount_value / 100)).toFixed(2))
    : Math.min(Number(promo.discount_value), Number(subtotal));

  res.json({ code: promo.code, discount, discount_type: promo.discount_type });
};
