const router = require('express').Router();
const ctrl = require('../controllers/promoController');

router.post('/apply', ctrl.apply);

module.exports = router;
