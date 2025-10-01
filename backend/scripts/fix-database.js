const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillwave');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createIndexSafely = async (collection, indexSpec, options = {}) => {
  try {
    await collection.createIndex(indexSpec, { background: true, ...options });
    console.log(`✅ Created index: ${JSON.stringify(indexSpec)}`);
  } catch (error) {
    if (error.code === 86 || error.message.includes('existing index has the same name')) {
      console.log(`ℹ️ Index already exists: ${JSON.stringify(indexSpec)}`);
    } else {
      console.error(`❌ Error creating index ${JSON.stringify(indexSpec)}:`, error.message);
    }
  }
};

const fixDatabase = async () => {
  try {
    console.log('🔧 Starting database cleanup...');
    
    // Get the database instance
    const db = mongoose.connection.db;
    
    // Drop problematic indexes
    try {
      await db.collection('helprequests').dropIndex('id_1');
      console.log('✅ Dropped problematic id index from helprequests');
    } catch (error) {
      console.log('ℹ️ No problematic index found or already dropped');
    }
    
    // Create proper indexes for helprequests
    await createIndexSafely(db.collection('helprequests'), { requester: 1 });
    await createIndexSafely(db.collection('helprequests'), { status: 1 });
    await createIndexSafely(db.collection('helprequests'), { category: 1 });
    await createIndexSafely(db.collection('helprequests'), { createdAt: -1 });
    console.log('✅ Processed indexes for helprequests');
    
    // Create indexes for messages
    await createIndexSafely(db.collection('messages'), { request: 1 });
    await createIndexSafely(db.collection('messages'), { sender: 1 });
    await createIndexSafely(db.collection('messages'), { receiver: 1 });
    await createIndexSafely(db.collection('messages'), { createdAt: -1 });
    console.log('✅ Processed indexes for messages');
    
    // Create indexes for users
    await createIndexSafely(db.collection('users'), { email: 1 }, { unique: true });
    await createIndexSafely(db.collection('users'), { googleId: 1 }, { unique: true });
    console.log('✅ Processed indexes for users');
    
    // Create indexes for categories
    await createIndexSafely(db.collection('categories'), { name: 1 });
    console.log('✅ Processed indexes for categories');
    
    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the cleanup
connectDB().then(() => {
  fixDatabase();
}); 