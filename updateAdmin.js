const mongoose = require('mongoose');
const User = require('./models/userModel');
require('dotenv').config({ path: './backend/.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const updateUser = async () => {
  await connectDB();
  try {
    const user = await User.findOne({ email: 'admin@test.com' });
    if (user) {
      user.isAdmin = true;
      await user.save();
      console.log('User updated successfully');
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error updating user:', error.message);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

updateUser();