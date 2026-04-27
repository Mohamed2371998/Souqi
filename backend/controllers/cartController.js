const pool = require('../config/db');

exports.getCart = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT c.id, c.quantity, p.id as product_id, p.name_ar, p.price_sar, p.image_url, p.stock_qty
     FROM cart c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`,
    [req.user.id]
  );
  res.json(rows);
};

exports.add = async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  await pool.execute(
    `INSERT INTO cart (user_id, product_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [req.user.id, product_id, quantity]
  );
  res.status(201).json({ message: 'تمت الإضافة للسلة' });
};

exports.update = async (req, res) => {
  await pool.execute('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [req.body.quantity, req.params.id, req.user.id]);
  res.json({ message: 'تم تحديث الكمية' });
};

exports.remove = async (req, res) => {
  await pool.execute('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'تم حذف العنصر' });
};
