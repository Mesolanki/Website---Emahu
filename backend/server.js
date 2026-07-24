// Reloaded with Razorpay key: rzp_test_TEvQeouxI9yhKh
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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
const reviewRoutes = require('./routes/reviewRoutes');

const paymentRoutes = require('./routes/paymentRoutes');

// Initialize app
const app = express();



// Connect to MongoDB Database
connectDB();

// Middleware
app.use(express.json({ limit: '50mb' })); // Parse JSON requests up to 50mb
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse url-encoded requests up to 50mb
app.use(cookieParser()); // Parse cookies from headers

const fs = require('fs');

// Ensure uploads directory exists on disk for Linux/VPS deployments
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded product files statically
app.use('/uploads', express.static(uploadsDir));

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

// Ensure database connection is active on every API request
app.use(async (req, res, next) => {
  // Allow root health check endpoint to respond even if DB is still warming up
  if (req.path === '/') {
    // Fire background connection attempt on ping
    connectDB().catch((err) => console.error('Background DB connect on ping error:', err.message));
    return next();
  }

  try {
    const mongoose = require('mongoose');
    const conn = await connectDB();
    if (!conn || mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not in ready state (readyState !== 1)');
    }
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err.message);
    return res.status(503).json({ 
      success: false, 
      error: `Database connection failed (${err.message}). Please verify MongoDB service or MONGO_URI in backend environment.` 
    });
  }
});

// Base route / health check (Pre-warms backend and DB)
app.get('/', (req, res) => {
  const mongoose = require('mongoose');
  res.status(200).json({
    success: true,
    message: 'Welcome to Emahu E-Commerce API',
    status: 'Running',
    dbConnected: mongoose.connection.readyState === 1,
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
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/audit', auditRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/delivery', deliveryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/reviews', reviewRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/payment', paymentRoutes);


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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `=========================================\n` +
    `  Emahu Server started in ${process.env.NODE_ENV} mode\n` +
    `  Access URL: http://localhost:${PORT}\n` +
    `=========================================`
  );
});

// Integrate Socket.io for Real-time delivery tracking
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Attach socketio instance to Express app context
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('Client connected to WebSockets:', socket.id);
  
  // Client can join a specific order room to receive granular updates
  socket.on('join-order', (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined order room: ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Handle unhandled promise rejections safely
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Promise Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
// Trigger nodemon restart after freeing port 5000
