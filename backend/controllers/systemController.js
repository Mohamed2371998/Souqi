const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

exports.downloadProjectZip = async (_req, res) => {
  const rootDir = path.resolve(__dirname, '../..');
  const filename = `souqi-project-${Date.now()}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('Zip error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'تعذر إنشاء الملف المضغوط' });
  });

  archive.pipe(res);

  const ignore = (entry) => {
    const p = entry.name;
    return (
      p.startsWith('.git/') ||
      p.startsWith('backend/node_modules/') ||
      p.startsWith('node_modules/') ||
      p.includes('/.env') ||
      p.endsWith('/.env') ||
      p.startsWith('backend/uploads/')
    );
  };

  archive.directory(rootDir, false, ignore);

  if (!fs.existsSync(rootDir)) {
    return res.status(404).json({ message: 'المجلد غير موجود' });
  }

  await archive.finalize();
};
