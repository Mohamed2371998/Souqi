const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
  body('phone').isLength({ min: 8 }),
  body('password').isLength({ min: 6 }),
], ctrl.register);

router.post('/login', authLimiter, [body('email').isEmail(), body('password').isLength({ min: 6 })], ctrl.login);
router.get('/me', auth, ctrl.me);
router.post('/logout', auth, ctrl.logout);

module.exports = router;
