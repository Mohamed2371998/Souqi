const router = require('express').Router();
const ctrl = require('../controllers/reviewsController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.create);
router.get('/product/:id', ctrl.byProduct);

module.exports = router;
