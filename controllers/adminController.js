const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get total orders
  const totalOrders = await Order.countDocuments();
  
  // Get total products
  const totalProducts = await Product.countDocuments();
  
  // Get total users (excluding admins)
  const totalUsers = await User.countDocuments({ isAdmin: false });
  
  // Calculate total revenue from completed and processing orders
  const orders = await Order.find({ 
    isPaid: true,
    status: { $in: ['completed', 'processing', 'shipped', 'delivered'] }
  });
  
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  
  // Get recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'name email');
  
  res.json({
    totalOrders,
    totalProducts,
    totalUsers,
    totalRevenue,
    recentOrders
  });
});

module.exports = {
  getDashboardStats
};