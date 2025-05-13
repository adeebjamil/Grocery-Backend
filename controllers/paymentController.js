const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Create Razorpay instance with better error handling
let razorpay;
try {
  // Check if keys are defined
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay credentials missing. Please check your .env file.');
  } else {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('Razorpay initialized successfully');
  }
} catch (error) {
  console.error('Razorpay initialization failed:', error);
}

// @desc    Create Razorpay order
// @route   POST /api/payments/razorpay
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  // Check if Razorpay is properly initialized
  if (!razorpay) {
    console.error('Razorpay not initialized - missing credentials');
    res.status(500);
    throw new Error('Payment service not configured properly. Please contact support.');
  }

  // Log the incoming request for debugging
  console.log('Razorpay order request received:', req.body);
  
  const { amount, currency = 'INR', receipt } = req.body;

  // Validate required fields
  if (!amount) {
    res.status(400);
    throw new Error('Amount is required');
  }

  const options = {
    amount: Math.round(amount), // Ensure amount is an integer
    currency,
    receipt: receipt || `receipt_${Date.now()}`,
  };

  console.log('Creating Razorpay order with options:', options);

  try {
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);
    res.status(200).json(order);
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500);
    throw new Error(`Payment gateway error: ${error.message}`);
  }
});

// @desc    Verify Razorpay payment and update order
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { 
    razorpay_payment_id, 
    razorpay_order_id, 
    razorpay_signature,
    orderId
  } = req.body;

  // Verify required fields
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
    res.status(400);
    throw new Error('Missing required payment information');
  }

  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      res.status(400);
      throw new Error('Payment verification failed: Invalid signature');
    }

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }
    
    // Update the order with payment information
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentMethod = 'Razorpay';
    order.paymentResult = {
      id: razorpay_payment_id,
      status: 'completed',
      update_time: Date.now().toString(),
      email_address: req.user.email
    };
    
    // IMPORTANT: Set status to "approved" instead of "completed"
    // This fits better with the order tracker visualization
    order.status = 'approved';
    
    console.log('Updating order status to approved after payment:', orderId);
    
    const updatedOrder = await order.save();
    
    // Log the update to verify it happened
    console.log('Order updated successfully:', {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
      isPaid: updatedOrder.isPaid
    });
    
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
});

module.exports = { createRazorpayOrder, verifyPayment };