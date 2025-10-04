const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/test?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Available Collections: ${collections.map(c => c.name).join(', ')}`);
    
    // Ensure required collections exist
    const requiredCollections = ['users', 'products', 'orders'];
    const existingCollections = collections.map(c => c.name);
    
    for (const collection of requiredCollections) {
      if (!existingCollections.includes(collection)) {
        console.log(`⚠️  Collection '${collection}' not found. It will be created when first document is inserted.`);
      } else {
        console.log(`✅ Collection '${collection}' exists`);
      }
    }
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
