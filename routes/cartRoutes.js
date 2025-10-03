
const express = require('express');
const router = express.Router();
const { addItemToCart, getUserCart, updateCartItemQuantity, removeCartItem } = require('../controllers/cartController.js');
const { protect } = require('../middleware/authMiddleware.js');

router.route('/').post(protect, addItemToCart).get(protect, getUserCart);
router.route('/:id').put(protect, updateCartItemQuantity).delete(protect, removeCartItem);

module.exports = router;
