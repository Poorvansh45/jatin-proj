const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI ;
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};


const testConnection = async () => {
  try {
    // Wait for connection to be open if not already
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('open', resolve);
        setTimeout(() => reject(new Error('Timed out waiting for MongoDB connection')), 5000);
      });
    }
    if (!mongoose.connection.db) {
      throw new Error('Mongoose connection.db is not available');
    }
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

module.exports = { connectDB, testConnection };
