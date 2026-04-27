const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { secret, expiresIn } = require('../config/jwt');
const { handleValidation } = require('./helpers');

exports.register = async (req, res) => {
  if (!handleValidation(req, res)) return;
  const { name, email, phone, password, preferred_lang = 'ar' } = req.body;
  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.execute('SELECT id FROM users WHERE email = ? OR phone = ?', [email, phone]);
    if (exists.length) return res.status(409).json({ message: 'المستخدم موجود بالفعل' });

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await conn.execute(
      'INSERT INTO users (name, email, phone, password_hash, preferred_lang) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, password_hash, preferred_lang]
    );
    return res.status(201).json({ id: result.insertId, message: 'تم إنشاء الحساب' });
  } finally {
    conn.release();
  }
};

exports.login = async (req, res) => {
  if (!handleValidation(req, res)) return;
  const { email, password } = req.body;
  const [rows] = await pool.execute('SELECT id, name, email, role, password_hash FROM users WHERE email = ?', [email]);
  if (!rows.length) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

exports.me = async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, email, phone, role, preferred_lang, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'المستخدم غير موجود' });
  return res.json(rows[0]);
};

exports.logout = async (_req, res) => res.json({ message: 'تم تسجيل الخروج' });
