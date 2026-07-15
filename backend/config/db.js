const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  // If connection is already open, reuse it
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  // If connection promise is cached, return it
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const opts = {
      maxPoolSize: 10,                 // Keep connection count low on serverless instances
      serverSelectionTimeoutMS: 15000, // Allow more time (15s) for database server cold starts
      socketTimeoutMS: 45000,          // Close inactive sockets after 45s
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, opts);
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Reset cached connection so next request can try again
    cachedConnection = null;
    throw error;
  }
};

module.exports = connectDB;


