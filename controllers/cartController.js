
const User = require('../models/userModel.js');
const Product = require('../models/productModel.js');

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addItemToCart = async (req, res) => {
  const { productId, quantity, weight } = req.body;

  const user = await User.findById(req.user._id);
  const product = await Product.findById(productId);

  if (user && product) {
    const cartItem = {
      product: productId,
      title: product.title,
      quantity: Number(quantity),
      weight,
      price: product.pricePerKg,
      discount: product.discount,
    };

    user.cart.push(cartItem);
    await user.save();
    res.status(201).json({ message: 'Item added to cart', cart: user.cart });
  } else {
    res.status(404);
    throw new Error('User or Product not found');
  }
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getUserCart = async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product', 'title image');

  if (user) {
    res.json(user.cart);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:id
// @access  Private
const updateCartItemQuantity = async (req, res) => {
  const { quantity } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    const itemIndex = user.cart.findIndex((item) => item._id.toString() === req.params.id);

    if (itemIndex > -1) {
      user.cart[itemIndex].quantity = Number(quantity);
      await user.save();
      res.json(user.cart[itemIndex]);
    } else {
      res.status(404);
      throw new Error('Cart item not found');
    }
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeCartItem = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.cart = user.cart.filter((item) => item._id.toString() !== req.params.id);
    await user.save();
    res.json({ message: 'Item removed from cart' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

module.exports = { addItemToCart, getUserCart, updateCartItemQuantity, removeCartItem };
