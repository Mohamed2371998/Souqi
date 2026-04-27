const router = require('express').Router();
const ctrl = require('../controllers/ordersController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.use(auth);
router.post('/', ctrl.createOrder);
router.get('/', ctrl.getMyOrders);
router.get('/:id', ctrl.getOrderById);
router.put('/:id/status', admin, ctrl.updateStatus);
router.get('/:id/invoice', ctrl.getInvoice);

module.exports = router;
