const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// Enhanced CORS configuration for production
app.use(cors({
  origin: [
    'https://arekattikameat.netlify.app',
    'https://arekattikameat.netlify.app/',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-client-id', 
    'x-client-secret', 
    'x-api-version',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection with your test database
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/test?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`📋 Collections: ${Object.keys(mongoose.connection.collections).join(', ')}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'AreKatikaMeat API is running!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    collections: Object.keys(mongoose.connection.collections)
  });
});

// CORS preflight handler
app.options('*', cors());

// Import and use routes
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
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: https://arekattikameat.netlify.app`);
  console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'connecting...'}`);
});
