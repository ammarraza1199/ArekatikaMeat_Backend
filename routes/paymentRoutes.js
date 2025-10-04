const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
router.use(cors({
  origin: [
    CLIENT_ORIGIN,
    'https://arekattikameat.netlify.app',
    'https://arekattikameat.netlify.app/'
  ],
  credentials: true
}));

const APP_ID = process.env.CASHFREE_APP_ID;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";
const BASE = process.env.CASHFREE_BASE || "https://sandbox.cashfree.com/pg";

if (!APP_ID || !SECRET_KEY) {
  console.error("❌ Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY in .env");
}

// Create Cashfree order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, email, phone, orderId } = req.body;

    const cashfreeOrderId = "order_" + Date.now();

    const payload = {
      order_id: cashfreeOrderId,
      order_amount: Number(amount || 100),
      order_currency: "INR",
      customer_details: {
        customer_id: "cust_" + Date.now(),
        customer_email: email || "test@cashfree.com",
        customer_phone: phone || "9999999999"
      },
      order_meta: {
        return_url: `https://arekattikameat.netlify.app/order-confirmation?order_id={order_id}&app_order_id=${orderId}`
      }
    };

    const headers = {
      "x-client-id": APP_ID,
      "x-client-secret": SECRET_KEY,
      "x-api-version": API_VERSION,
      "Content-Type": "application/json"
    };

    const resp = await axios.post(`${BASE}/orders`, payload, { headers });
    res.json({ ...resp.data, order_id: cashfreeOrderId, app_order_id: orderId });
  } catch (err) {
    console.error("Create order error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Get order status
router.get('/order-status/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;
    const headers = {
      "x-client-id": APP_ID,
      "x-client-secret": SECRET_KEY,
      "x-api-version": API_VERSION
    };
    const resp = await axios.get(`${BASE}/orders/${order_id}`, { headers });
    res.json(resp.data);
  } catch (err) {
    console.error("Get order error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Webhook for payment status updates
router.post('/webhook/cashfree', (req, res) => {
  console.log("Webhook received:", req.headers, req.body);
  // Here you can update your database with payment status
  res.sendStatus(200);
});

module.exports = router;