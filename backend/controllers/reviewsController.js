const pool = require('../config/db');

exports.create = async (req, res) => {
  const { product_id, rating, comment } = req.body;
  await pool.execute(
    `INSERT INTO reviews (user_id, product_id, rating, comment)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)`,
    [req.user.id, product_id, rating, comment || null]
  );
  res.status(201).json({ message: 'تم حفظ التقييم' });
};

exports.byProduct = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT r.*, u.name FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? ORDER BY r.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
};
