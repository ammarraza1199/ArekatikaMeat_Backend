const Cashfree = require('cashfree-pg');
const Order = require('../models/orderModel');

// Initialize Cashfree SDK
Cashfree.Cashfree.init(
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET,
  Cashfree.Cashfree.Environment.PRODUCTION // Use SANDBOX for testing, PRODUCTION for live
);

// @desc    Create Cashfree order session
// @route   POST /api/payment/create-order
// @access  Private
const createCashfreeOrder = async (req, res) => {
  const { orderId, amount, currency = 'INR' } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Ensure the amount matches the order total
    if (order.totalPrice !== amount) {
      res.status(400);
      throw new Error('Amount mismatch with order total');
    }

    const request = {
      order_id: order._id.toString(),
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_email: req.user.email,
        customer_phone: req.user.phone || '9999999999', // Use a dummy phone if not available
      },
      order_meta: {
        return_url: `http://localhost:3000/order-confirmation?order_id={order_id}&order_token={order_token}`,
      },
    };

    const response = await Cashfree.Cashfree.PG.Order.create(request);

    if (response && response.data && response.data.payment_session_id) {
      res.status(200).json({
        payment_session_id: response.data.payment_session_id,
        order_id: response.data.order_id,
      });
    } else {
      res.status(500);
      throw new Error('Failed to create Cashfree order session');
    }
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Handle Cashfree webhook notifications
// @route   POST /api/payment/webhook
// @access  Public (Cashfree will call this)
const handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature (important for security)
    const { signature } = req.headers;
    const { order_id, order_status } = req.body;

    // In a real application, you would verify the signature using Cashfree's SDK or a custom function
    // For now, we'll proceed without full verification, but this is a critical security step.
    console.log('Cashfree Webhook received:', req.body);

    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order_status === 'PAID') {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = { // Store relevant payment details
        id: req.body.cf_payment_id,
        status: req.body.order_status,
        update_time: Date.now(),
        email_address: req.body.customer_details.customer_email,
      };
      order.status = 'Order Placed'; // Or a more appropriate initial status
    } else if (order_status === 'FAILED') {
      order.status = 'Payment Failed';
    } else if (order_status === 'PENDING') {
      order.status = 'Payment Pending';
    }

    await order.save();

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCashfreeOrder, handleWebhook };
