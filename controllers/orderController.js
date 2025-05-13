// filepath: c:\Users\USER\Desktop\Grocery\backend\controllers\orderController.js
const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { 
    items, 
    shippingAddress, 
    paymentMethod,
  } = req.body;

  if (items && items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  } else {
    // Calculate total price and validate item availability
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = await Product.findById(item.productId);
      
      if (!product) {
        res.status(404);
        throw new Error(`Product ${item.productId} not found`);
      }
      
      if (product.stock < item.quantity) {
        res.status(400);
        throw new Error(`Not enough stock for ${product.title}`);
      }
      
      total += item.quantity * product.price;
      
      // Update the item with current price
      items[i].price = product.price;
      
      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = new Order({
      userId: req.user._id,
      items,
      total,
      shippingAddress,
      paymentMethod,
    });

    const createdOrder = await order.save();

    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  // Populate product information within order items
  const order = await Order.findById(req.params.id)
    .populate({
      path: 'items.productId',
      select: 'title image price',
    });

  if (order) {
    // Check if the order belongs to the logged-in user
    if (order.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to view this order');
    }
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    res.status(400);
    throw new Error('Status is required');
  }
  
  // Validate status
  const validStatuses = ['pending', 'approved', 'processing', 'shipped', 'on the way', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  // Update the order
  order.status = status;
  
  // If status is delivered, set delivery date
  if (status === 'delivered') {
    order.deliveredAt = Date.now();
  }
  
  // For shipped status, set shipped date
  if (status === 'shipped') {
    order.shippedAt = Date.now();
  }
  
  const updatedOrder = await order.save();
  
  // In a real-world app, you could send email/SMS notifications here
  console.log(`Order ${order._id} status updated to ${status}`);
  
  res.json(updatedOrder);
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id });
  res.json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('userId', 'id name');
  res.json(orders);
});

// @desc    Generate invoice PDF for an order
// @route   GET /api/orders/:id/invoice
// @access  Private
const generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate({
      path: 'items.productId',
      select: 'title image price'
    })
    .populate({
      path: 'userId',
      select: 'name email'
    });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if user has permission to access this order
  if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this order');
  }

  // Use PDFKit to generate the invoice
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });
  
  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

  // Pipe PDF output to response
  doc.pipe(res);

  // Add company letterhead
  doc
    .fontSize(20)
    .text('Grocery Shop', { align: 'center' })
    .fontSize(12)
    .text('123 Main Street, City, Country', { align: 'center' })
    .text('Phone: +1234567890 | Email: info@groceryshop.com', { align: 'center' })
    .moveDown(2);

  // Add invoice title and number
  doc
    .fontSize(16)
    .text(`INVOICE`, { align: 'center' })
    .fontSize(10)
    .text(`Invoice #: ${order._id}`, { align: 'center' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'center' })
    .moveDown(1);

  // Add customer information
  doc
    .fontSize(12)
    .text('Bill To:', { continued: true })
    .fontSize(10)
    .text(` ${order.userId.name}`, { align: 'left' })
    .text(`Email: ${order.userId.email}`)
    .text(`Shipping Address: ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`)
    .text(`Phone: ${order.shippingAddress.phone}`)
    .moveDown(2);

  // Add invoice table headers
  let invoiceTableTop = doc.y;
  doc
    .fontSize(10)
    .text('Item', 50, invoiceTableTop)
    .text('Quantity', 280, invoiceTableTop)
    .text('Unit Price', 350, invoiceTableTop)
    .text('Amount', 450, invoiceTableTop)
    .moveDown();

  // Add horizontal line
  let y = doc.y;
  doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();

  // Add invoice items
  let position = y + 15;
  order.items.forEach(item => {
    const productName = item.productId ? item.productId.title : 'Product';
    doc
      .fontSize(10)
      .text(productName, 50, position)
      .text(item.quantity.toString(), 280, position)
      .text(`₹${item.price.toFixed(2)}`, 350, position)
      .text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, position);
    position += 20;
  });

  // Add horizontal line
  doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, position).lineTo(550, position).stroke();
  position += 15;

  // Add subtotal, shipping, and total
  doc
    .fontSize(10)
    .text('Subtotal:', 350, position)
    .text(`₹${order.total.toFixed(2)}`, 450, position);
  position += 20;

  doc
    .text('Shipping:', 350, position)
    .text(`₹${order.total > 500 ? '0.00' : '50.00'}`, 450, position);
  position += 20;

  doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(350, position).lineTo(550, position).stroke();
  position += 15;

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Total:', 350, position)
    .text(`₹${order.total.toFixed(2)}`, 450, position);

  // Add payment information
  position += 40;
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Payment Method: ${order.paymentMethod}`, 50, position);
  position += 15;
  
  doc.text(`Payment Status: ${order.isPaid ? 'Paid' : 'Pending'}`, 50, position);
  if (order.isPaid && order.paidAt) {
    position += 15;
    doc.text(`Paid on: ${new Date(order.paidAt).toLocaleDateString()}`, 50, position);
  }

  // Add footer
  doc
    .fontSize(10)
    .text('Thank you for shopping with us!', 50, 700, { align: 'center' })
    .fontSize(8)
    .text('For questions regarding this invoice, please contact our customer support.', 50, 720, { align: 'center' });

  // Finalize the PDF
  doc.end();
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  generateInvoice
};