const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameBn: { type: String },
  category: {
    type: String,
    enum: ['Mango', 'Amra', 'Dragon Fruit', 'Dates', 'Pickle', 'Combo', 'Agro'],
    required: true
  },
  description: { type: String },
  price: { type: Number, required: true },
  maxPrice: { type: Number },
  weightOptions: [{ type: String }],
  images: [{ type: String }],
  stock: { type: Number, default: 100 },
  isPreOrder: { type: Boolean, default: false },
  deliveryEstimate: { type: String },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);