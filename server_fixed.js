const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    'https://arekattikameat.netlify.app',
    'https://arekattikameat.netlify.app/',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id', 'x-client-secret', 'x-api-version']
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running...', 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}`);
});
