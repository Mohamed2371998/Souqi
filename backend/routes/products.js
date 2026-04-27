const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/productsController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', auth, admin, upload.single('image'), [body('category_id').isInt(), body('name_ar').notEmpty(), body('name_en').notEmpty(), body('price_sar').isFloat({ min: 0 })], ctrl.create);
router.put('/:id', auth, admin, upload.single('image'), ctrl.update);
router.delete('/:id', auth, admin, ctrl.remove);

module.exports = router;
