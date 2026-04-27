const router = require('express').Router();
const ctrl = require('../controllers/paymentsController');
const auth = require('../middleware/auth');

router.post('/initiate', auth, ctrl.initiateGatewayPayment);
router.post('/callback', ctrl.gatewayCallback);
router.post('/tamara/create-session', auth, ctrl.createTamaraSession);
router.post('/tamara/notification', ctrl.tamaraNotification);
router.post('/tabby/create-session', auth, ctrl.createTabbySession);
router.post('/tabby/webhook', ctrl.tabbyWebhook);
router.post('/cod', auth, ctrl.setCOD);

module.exports = router;
