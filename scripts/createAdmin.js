require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // You need this package

async function createAdmin() {
  try {
    // Use the MONGODB_URI directly from your .env file
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    // Hash the password - THIS IS THE CRITICAL FIX
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123', salt);
    
    // Create admin user or update existing user
    const adminUser = await User.findOneAndUpdate(
      { email: 'adeeb@gmail.com' },
      {
        name: 'Adeeb jamil',
        email: 'adeeb@gmail.com',
        password: hashedPassword, // Use the hashed password here
        isAdmin: true
      },
      { upsert: true, new: true }
    );
    
    console.log('Admin user created/updated:', adminUser);
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin:', error);
    mongoose.disconnect();
  }
}

createAdmin();