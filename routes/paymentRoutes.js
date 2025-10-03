const express = require('express');
const router = express.Router();
const { createCashfreeOrder, handleWebhook } = require('../controllers/paymentController.js');
const { protect } = require('../middleware/authMiddleware.js');

router.route('/create-order').post(protect, createCashfreeOrder);
router.route('/webhook').post(handleWebhook);

module.exports = router;
