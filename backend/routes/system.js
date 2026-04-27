const router = require('express').Router();
const { downloadProjectZip } = require('../controllers/systemController');

router.get('/download-project', downloadProjectZip);

module.exports = router;
