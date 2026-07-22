const mongoose = require('mongoose');

let connectionPromise = null;

/**
 * Connect to MongoDB Database with automatic retry logic for database server cold starts / standby wake-ups.
 * Handles serverless execution contexts cleanly by caching the connection Promise across invocations.
 */
const connectDB = async (retries = 3, delayMs = 1500) => {
  // If connection is already open (readyState === 1), return active connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection promise is currently in-flight, await its completion
  if (connectionPromise) {
    try {
      await connectionPromise;
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }
    } catch (err) {
      // If the cached promise failed, reset and fall through to attempt a fresh connection
      connectionPromise = null;
    }
  }

  const opts = {
    maxPoolSize: 10,                 // Keep connection pool optimal for serverless/PaaS
    serverSelectionTimeoutMS: 15000, // 15 seconds allowance for database cold start / standby wake-up
    socketTimeoutMS: 45000,          // Close inactive sockets after 45s
    bufferCommands: true,            // Enable Mongoose command buffering while connecting
  };

  const attemptConnect = async (attempt) => {
    try {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI environment variable is not defined in backend process.');
      }

      const conn = await mongoose.connect(mongoUri, opts);
      console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`MongoDB Connection Error (Attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`Database server may be waking up from standby. Retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        return attemptConnect(attempt + 1);
      }
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
