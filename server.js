
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});

const authRoutes = require('./routes/authRoutes.js');
app.use('/api/users', authRoutes);

const productRoutes = require('./routes/productRoutes.js');
app.use('/api/products', productRoutes);

const adminRoutes = require('./routes/adminRoutes.js');
app.use('/api/admin', adminRoutes);

const orderRoutes = require('./routes/orderRoutes.js');
app.use('/api/admin/orders', orderRoutes);

const cartRoutes = require('./routes/cartRoutes.js');
app.use('/api/cart', cartRoutes);

const paymentRoutes = require('./routes/paymentRoutes.js');
app.use('/api/payment', paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
