const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// একটু একটু করে চেক করুন কোনটা crash করাচ্ছে
app.use('/api/auth', require('./routes/auth'));
 app.use('/api/products', require('./routes/products'));
 app.use('/api/orders', require('./routes/orders'));
 app.use('/api/payments', require('./routes/payments'));
 app.use('/api/assistant', require('./routes/assistant'));
 app.use('/api/reviews', require('./routes/reviews'));
 app.use('/api/farmers', require('./routes/farmers'));

app.get('/', (req, res) => res.send('Premium Fruits API Running 🍎'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));