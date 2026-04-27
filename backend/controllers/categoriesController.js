const pool = require('../config/db');
const { handleValidation } = require('./helpers');

exports.getAll = async (_req, res) => {
  const [rows] = await pool.execute('SELECT * FROM categories ORDER BY id ASC');
  res.json(rows);
};

exports.create = async (req, res) => {
  if (!handleValidation(req, res)) return;
  const { name_ar, name_en, slug, description_ar, description_en, image_url } = req.body;
  const [result] = await pool.execute(
    'INSERT INTO categories (name_ar, name_en, slug, description_ar, description_en, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name_ar, name_en, slug, description_ar || null, description_en || null, image_url || null]
  );
  res.status(201).json({ id: result.insertId, message: 'تم إنشاء التصنيف' });
};
