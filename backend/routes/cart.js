const router = require('express').Router();
const ctrl = require('../controllers/cartController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.getCart);
router.post('/', ctrl.add);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
