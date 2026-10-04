const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalProtect = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer')) return next();

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

const protect = (req, res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer')) {
    return res.status(401).json({ message: 'No token' });
  }
  return optionalProtect(req, res, next);
};

const admin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
};

module.exports = { protect, optionalProtect, admin };