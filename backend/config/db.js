const mongoose = require('mongoose');

let connectionPromise = null;

/**
 * Connect to MongoDB Database with automatic retry logic for database server cold starts / standby wake-ups.
 * Optimized for serverless & PaaS cloud platforms (Render, Vercel, Railway).
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
      // If cached in-flight promise rejected, reset to allow fresh attempt
      connectionPromise = null;
    }
  }

  const opts = {
    maxPoolSize: 10,                // Keep connection pool optimal for serverless/PaaS
    serverSelectionTimeoutMS: 5000, // 5s timeout per attempt to keep response fast within HTTP limits
    socketTimeoutMS: 45000,         // Close inactive sockets after 45s
    family: 4,                      // Force IPv4 to bypass IPv6 dual-stack DNS delays on cloud hosts
    bufferCommands: true,           // Enable Mongoose query buffering while connecting
  };

  const attemptConnect = async (attempt) => {
    try {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI environment variable is not defined in backend environment.');
      }

      const conn = await mongoose.connect(mongoUri, opts);
      console.log(`[DB] MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`[DB] MongoDB Connection Error (Attempt ${attempt}/${retries}): ${error.message}`);
      
      if (attempt < retries) {
        console.log(`[DB] Database server may be waking up from standby. Retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        return attemptConnect(attempt + 1);
      }

      console.warn(
        '⚠️ LIVE DEPLOYMENT TROUBLESHOOTING CHECKLIST:\n' +
        '1. In MongoDB Atlas Dashboard -> Network Access -> Add IP Address -> Add "0.0.0.0/0" (Allow Access From Anywhere).\n' +
        '2. In Render/Vercel Dashboard -> Environment Variables -> Ensure MONGO_URI is set correctly with password URL-encoded if it contains special characters.\n' +
        '3. Ensure database user has readWrite permissions.'
      );
      throw error;
    }
  };

  connectionPromise = attemptConnect(1)
    .catch((err) => {
      // Reset cached promise on ultimate failure so subsequent requests can retry cleanly
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
};

module.exports = connectDB;
