const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const { protect, admin } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const farmer = await Farmer.create(req.body);
    res.status(201).json(farmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', protect, admin, async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(farmer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;