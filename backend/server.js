require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

// Initialize app
const app = express();



// Connect to MongoDB Database
connectDB();

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cookieParser()); // Parse cookies from headers

// CORS configuration (allow requests from frontend ports like 3000, 5173, etc. or allow all for development)
app.use(
  cors({
    origin: (origin, callback) => {
      // Echo the request origin dynamically so that credentials/cookies are allowed
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Base route / health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Emahu E-Commerce API',
    status: 'Running',
    availableRoutes: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      refresh: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout',
      getMe: 'GET /api/auth/me (Private)',
      updateDetails: 'PUT /api/auth/update-details (Private)',
      updatePassword: 'PUT /api/auth/update-password (Private)'
    }
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/delivery', deliveryRoutes);


// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Resource not found - ${req.originalUrl}`
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Set port and start listening
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `=========================================\n` +
    `  Emahu Server started in ${process.env.NODE_ENV} mode\n` +
    `  Access URL: http://localhost:${PORT}\n` +
    `=========================================`
  );
});

// Handle unhandled promise rejections safely
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Promise Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
