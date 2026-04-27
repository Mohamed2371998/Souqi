const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/categoriesController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', ctrl.getAll);
router.post('/', auth, admin, [body('name_ar').notEmpty(), body('name_en').notEmpty(), body('slug').notEmpty()], ctrl.create);

module.exports = router;
