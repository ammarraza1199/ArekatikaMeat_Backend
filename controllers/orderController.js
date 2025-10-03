const Order = require('../models/orderModel.js');
const User = require('../models/userModel.js');
const Product = require('../models/productModel.js');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400);
      throw new Error('No order items');
      return;
    } else {
      const user = await User.findById(req.user._id);

      const productIds = orderItems.map((x) => x.product);

      const itemsFromDB = await Product.find({
        _id: { $in: productIds },
      });

      const dbOrderItems = orderItems.map((item) => {
        const matchingItem = itemsFromDB.find(
          (x) => x._id.toString() === item.product.toString()
        );
        if (!matchingItem) {
          throw new Error(`Product with ID ${item.product} not found in database`);
        }
        return {
          ...item,
          product: item.product,
          price: matchingItem.pricePerKg,
        };
      });

      const totalPrice = dbOrderItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );

      const order = new Order({
        user: req.user._id,
        orderItems: dbOrderItems,
        shippingAddress,
        paymentMethod,
        totalPrice,
        isPaid: false,
        status: 'Payment Pending',
      });

      const createdOrder = await order.save();

      // Clear user cart after order creation
      user.cart = [];
      await user.save();

      res.status(201).json(createdOrder);
    }
  } catch (error) {
    console.error("Error during order creation:", error);
    res.status(500);
    throw error;
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'firstName email'
  );

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  const orders = await Order.find({}).populate('user', 'id firstName lastName');
  res.json(orders);
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.status = req.body.status || order.status;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

module.exports = { createOrder, getOrderById, getMyOrders, getOrders, updateOrderStatus };