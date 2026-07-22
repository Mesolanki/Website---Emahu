const mongoose = require('mongoose');

let connectionPromise = null;

/**
 * Connect to MongoDB Database with automatic retry and local/cloud fallback.
 * Works seamlessly on local development, VPS servers, and cloud hosts (Render/Vercel).
 */
const connectDB = async (retries = 3, delayMs = 1200) => {
  // 1. If connection is already open (readyState === 1), return active connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2. If a connection promise is currently in-flight, await its completion
  if (connectionPromise) {
    try {
      await connectionPromise;
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }
    } catch (err) {
      connectionPromise = null;
    }
  }

  const opts = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: true,
  };

  const attemptConnect = async (attempt) => {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/emahu';
    
    // Convert 'localhost' to '127.0.0.1' for faster Node.js loopback resolution on Linux
    if (mongoUri.includes('localhost')) {
      mongoUri = mongoUri.replace('localhost', '127.0.0.1');
    }

    try {
      const conn = await mongoose.connect(mongoUri, opts);
      console.log(`[DB] MongoDB Connected successfully: ${conn.connection.host}:${conn.connection.port || ''}`);
      return conn;
    } catch (error) {
      console.error(`[DB] MongoDB Connection Error (Attempt ${attempt}/${retries}): ${error.message}`);
      
      if (attempt < retries) {
        console.log(`[DB] Retrying connection in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        return attemptConnect(attempt + 1);
      }

      throw new Error(`MongoDB Connection Failed on ${mongoUri.replace(/:([^@]+)@/, ':****@')}: ${error.message}`);
    }
  };

  connectionPromise = attemptConnect(1)
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
};

module.exports = connectDB;
