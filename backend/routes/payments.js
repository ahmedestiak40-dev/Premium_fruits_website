const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const { optionalProtect } = require('../middleware/auth');
const {
  createPaymentSession,
  createTransactionId,
  isConfigured,
  validatePayment,
} = require('../services/sslcommerz');

const router = express.Router();
const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const resultUrl = (orderId) => {
  const url = new URL('/payment-result', frontendUrl());
  if (orderId) url.searchParams.set('orderId', String(orderId));
  return url.toString();
};

const amountMatches = (gatewayAmount, orderAmount) =>
  Number.isFinite(Number(gatewayAmount)) &&
  Math.round(Number(gatewayAmount) * 100) === Math.round(Number(orderAmount) * 100);

function canAccessPaymentOrder(order, req, suppliedToken) {
  if (order.user) {
    return Boolean(req.user && String(req.user._id) === String(order.user));
  }
  const suppliedHash = crypto
    .createHash('sha256')
    .update(String(suppliedToken || ''))
    .digest();
  const expectedHash = Buffer.from(order.paymentInitTokenHash || '', 'hex');
  return expectedHash.length === suppliedHash.length &&
    crypto.timingSafeEqual(expectedHash, suppliedHash);
}

async function markVerifiedPayment(payload) {
  if (!payload?.tran_id || !payload?.val_id) {
    throw new Error('Payment callback is missing transaction details.');
  }
  const order = await Order.findOne({ transactionId: payload.tran_id });
  if (!order || order.paymentMethod !== 'SSLCommerz') {
    throw new Error('Payment transaction was not found.');
  }
  const validation = await validatePayment(payload.val_id);
  if (
    !['VALID', 'VALIDATED'].includes(validation.status) ||
    validation.tran_id !== order.transactionId ||
    String(validation.val_id) !== String(payload.val_id) ||
    validation.currency !== 'BDT' ||
    validation.currency_type !== 'BDT' ||
    !['0', '1'].includes(String(validation.risk_level)) ||
    !amountMatches(validation.amount, order.totalAmount)
  ) {
    throw new Error('Payment verification did not match this order.');
  }

  if (order.paymentStatus !== 'Paid') {
    order.paymentStatus = 'Paid';
    order.validationId = validation.val_id;
    order.paymentRiskLevel = Number(validation.risk_level);
    order.paidAt = new Date();
    order.status = order.paymentRiskLevel === 0 ? 'Confirmed' : 'Pending';
    await order.save();
  }
  return order;
}

router.get('/config', (req, res) => {
  res.json({ sslcommerzEnabled: isConfigured() });
});

router.post('/status/:orderId', optionalProtect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('user paymentMethod paymentStatus status totalAmount +paymentInitTokenHash');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!canAccessPaymentOrder(order, req, req.body.paymentInitToken)) {
      return res.status(403).json({ message: 'Invalid payment authorization.' });
    }
    res.json({
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      totalAmount: order.totalAmount,
    });
  } catch (err) {
    res.status(400).json({ message: 'Could not check payment status.' });
  }
});

router.post('/sslcommerz/init/:orderId', optionalProtect, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Online payment is not configured yet.' });
  }

  try {
    const existingOrder = await Order.findById(req.params.orderId)
      .select('+paymentInitTokenHash');
    if (!existingOrder) return res.status(404).json({ message: 'Order not found.' });
    if (!canAccessPaymentOrder(existingOrder, req, req.body.paymentInitToken)) {
      return res.status(403).json({ message: 'Invalid payment authorization.' });
    }
    if (existingOrder.paymentMethod !== 'SSLCommerz') {
      return res.status(400).json({ message: 'This order is not set up for online payment.' });
    }
    if (existingOrder.paymentStatus === 'Paid') {
      return res.status(409).json({ message: 'This order is already paid.' });
    }
    if (existingOrder.totalAmount < 10 || existingOrder.totalAmount > 500000) {
      return res.status(400).json({ message: 'SSLCommerz supports order totals from ৳10 to ৳500,000.' });
    }

    const transactionId = createTransactionId();
    const order = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        paymentMethod: 'SSLCommerz',
        paymentStatus: { $in: ['Unpaid', 'Failed', 'Cancelled'] },
      },
      { $set: { paymentStatus: 'Pending', transactionId } },
      { new: true }
    );
    if (!order) {
      return res.status(409).json({ message: 'A payment session is already being prepared.' });
    }

    try {
      const gatewayUrl = await createPaymentSession(order, transactionId);
      res.json({ gatewayUrl });
    } catch (err) {
      await Order.updateOne(
        { _id: order._id, transactionId, paymentStatus: 'Pending' },
        { $set: { paymentStatus: 'Failed' } }
      );
      throw err;
    }
  } catch (err) {
    res.status(502).json({ message: err.message || 'Could not start online payment.' });
  }
});

router.post('/sslcommerz/success', async (req, res) => {
  try {
    const order = await markVerifiedPayment(req.body);
    res.redirect(resultUrl(order._id));
  } catch (err) {
    const order = req.body?.tran_id
      ? await Order.findOne({ transactionId: req.body.tran_id }).select('_id').catch(() => null)
      : null;
    console.error('SSLCommerz success callback verification failed:', err.message);
    res.redirect(resultUrl(order?._id));
  }
});

router.post('/sslcommerz/fail', async (req, res) => {
  const order = req.body?.tran_id
    ? await Order.findOneAndUpdate(
        { transactionId: req.body.tran_id, paymentStatus: { $ne: 'Paid' } },
        { $set: { paymentStatus: 'Failed' } },
        { new: true }
      ).catch(() => null)
    : null;
  res.redirect(resultUrl(order?._id));
});

router.post('/sslcommerz/cancel', async (req, res) => {
  const order = req.body?.tran_id
    ? await Order.findOneAndUpdate(
        { transactionId: req.body.tran_id, paymentStatus: { $ne: 'Paid' } },
        { $set: { paymentStatus: 'Cancelled' } },
        { new: true }
      ).catch(() => null)
    : null;
  res.redirect(resultUrl(order?._id));
});

router.post('/sslcommerz/ipn', async (req, res) => {
  try {
    if (req.body?.status === 'VALID') {
      await markVerifiedPayment(req.body);
    } else if (['FAILED', 'CANCELLED', 'EXPIRED', 'UNATTEMPTED'].includes(req.body?.status)) {
      const paymentStatus = req.body.status === 'CANCELLED' ? 'Cancelled' : 'Failed';
      await Order.updateOne(
        { transactionId: req.body.tran_id, paymentStatus: { $ne: 'Paid' } },
        { $set: { paymentStatus } }
      );
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('SSLCommerz IPN verification failed:', err.message);
    res.status(400).send('Payment notification could not be verified.');
  }
});

module.exports = router;
