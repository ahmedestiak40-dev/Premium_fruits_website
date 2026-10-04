const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, optionalProtect, admin } = require('../middleware/auth');

router.post('/', optionalProtect, async (req, res) => {
  try {
    const { customerName, customerEmail, phone, address, items, paymentMethod = 'COD' } = req.body;
    if (!customerName?.trim() || !phone?.trim() || !address?.trim()) {
      return res.status(400).json({ message: 'Name, phone, and delivery address are required.' });
    }
    if (!['COD', 'SSLCommerz'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Unsupported payment method.' });
    }
    if (paymentMethod === 'SSLCommerz' && !customerEmail?.trim()) {
      return res.status(400).json({ message: 'Email is required for online payment.' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ message: 'Order must contain 1 to 50 items.' });
    }

    const verifiedItems = await Promise.all(items.map(async (item) => {
      if (!mongoose.isValidObjectId(item.product)) {
        throw new Error('An item in this order is invalid.');
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new Error('Item quantity must be between 1 and 99.');
      }
      const product = await Product.findById(item.product);
      if (!product) throw new Error('A product in this order is no longer available.');
      const weight = item.weight || '';
      if (product.weightOptions?.length && !product.weightOptions.includes(weight)) {
        throw new Error(`${product.name} has an invalid weight option.`);
      }
      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        weight,
      };
    }));
    const totalAmount = verifiedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: 'Order total must be greater than zero.' });
    }

    const orderData = {
      customerName: customerName.trim(),
      customerEmail: customerEmail?.trim() || undefined,
      phone: phone.trim(),
      address: address.trim(),
      items: verifiedItems,
      totalAmount,
      paymentMethod,
      paymentStatus: 'Unpaid',
    };
    const paymentInitToken = paymentMethod === 'SSLCommerz'
      ? crypto.randomBytes(32).toString('hex')
      : undefined;
    if (paymentInitToken) {
      orderData.paymentInitTokenHash = crypto
        .createHash('sha256')
        .update(paymentInitToken)
        .digest('hex');
    }
    if (req.user) orderData.user = req.user._id;
    const order = await Order.create(orderData);
    const safeOrder = order.toObject();
    delete safeOrder.paymentInitTokenHash;
    res.status(201).json({
      ...safeOrder,
      ...(paymentInitToken ? { paymentInitToken } : {}),
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Could not create the order.' });
  }
});

router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find().populate('items.product').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;