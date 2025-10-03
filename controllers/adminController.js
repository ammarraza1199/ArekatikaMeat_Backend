
const Order = require('../models/orderModel.js');
const Product = require('../models/productModel.js');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  const totalOrders = await Order.countDocuments({});
  const totalRevenue = await Order.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$totalPrice' },
      },
    },
  ]);

  const itemsPacked = await Order.countDocuments({ isDelivered: false });

  res.json({
    totalOrders,
    totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
    itemsPacked,
  });
};

module.exports = { getDashboardStats };
