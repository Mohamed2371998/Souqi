const pool = require('../config/db');
const { handleValidation } = require('./helpers');

exports.list = async (req, res) => {
  const {
    category, price_min, price_max, brand, search, sort = 'latest', installment_eligible,
  } = req.query;
  const conditions = [];
  const values = [];

  if (category) { conditions.push('p.category_id = ?'); values.push(category); }
  if (price_min) { conditions.push('p.price_sar >= ?'); values.push(Number(price_min)); }
  if (price_max) { conditions.push('p.price_sar <= ?'); values.push(Number(price_max)); }
  if (brand) { conditions.push('p.brand = ?'); values.push(brand); }
  if (installment_eligible !== undefined) {
    conditions.push('p.installment_eligible = ?');
    values.push(installment_eligible === 'true' ? 1 : 0);
  }
  if (search) {
    conditions.push('(p.name_ar LIKE ? OR p.name_en LIKE ? OR p.description_ar LIKE ? OR p.description_en LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortMap = {
    latest: 'p.created_at DESC',
    rating: 'avg_rating DESC',
    price_asc: 'p.price_sar ASC',
    price_desc: 'p.price_sar DESC',
  };

  const [rows] = await pool.execute(
    `SELECT p.*, c.name_ar as category_name_ar, IFNULL(AVG(r.rating),0) as avg_rating
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN reviews r ON r.product_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY ${sortMap[sort] || sortMap.latest}`,
    values
  );
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en
     FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'المنتج غير موجود' });
  return res.json(rows[0]);
};

exports.create = async (req, res) => {
  if (!handleValidation(req, res)) return;
  const data = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (data.image_url || null);
  const [result] = await pool.execute(
    `INSERT INTO products
    (category_id, name_ar, name_en, description_ar, description_en, price_sar, stock_qty, image_url, brand, is_featured, vat_included, installment_eligible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.category_id, data.name_ar, data.name_en, data.description_ar || null, data.description_en || null,
      data.price_sar, data.stock_qty, imageUrl, data.brand || null,
      !!data.is_featured, data.vat_included !== undefined ? !!data.vat_included : true, !!data.installment_eligible]
  );
  res.status(201).json({ id: result.insertId, message: 'تمت إضافة المنتج' });
};

exports.update = async (req, res) => {
  const data = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : data.image_url;
  await pool.execute(
    `UPDATE products SET category_id=?, name_ar=?, name_en=?, description_ar=?, description_en=?,
     price_sar=?, stock_qty=?, image_url=?, brand=?, is_featured=?, vat_included=?, installment_eligible=?
     WHERE id=?`,
    [data.category_id, data.name_ar, data.name_en, data.description_ar || null, data.description_en || null,
      data.price_sar, data.stock_qty, imageUrl, data.brand || null,
      !!data.is_featured, !!data.vat_included, !!data.installment_eligible, req.params.id]
  );
  res.json({ message: 'تم تحديث المنتج' });
};

exports.remove = async (req, res) => {
  await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ message: 'تم حذف المنتج' });
};
