const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(__dirname, '../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('يسمح بالصور فقط'));
    return;
  }
  cb(null, true);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } });
