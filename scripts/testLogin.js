require('dotenv').config();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function testLogin() {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if user exists first
    const user = await User.findOne({ email: 'adeeb@gmail.com' });
    
    if (user) {
      console.log('Found user in DB:');
      console.log({
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        hasPassword: !!user.password
      });

      // Ensure correct password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);
      
      // Update with new hash to be certain
      user.password = hashedPassword;
      await user.save();
      console.log('User password updated with fresh hash');
    } else {
      console.log('User not found - creating admin user');
      
      // Create new user if not exists
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);
      
      const newUser = new User({
        name: 'Adeeb jamil',
        email: 'adeeb@gmail.com',
        password: hashedPassword,
        isAdmin: true
      });
      
      await newUser.save();
      console.log('Admin user created');
    }

    // Try to login via API
    try {
      console.log('Testing login via API...');
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'adeeb@gmail.com',
        password: '123'
      });
      
      console.log('Login API Response:', response.data);
      console.log('LOGIN TEST SUCCESSFUL ✅');
    } catch (apiError) {
      console.error('API Login Error:');
      console.error(apiError.response?.data || apiError.message);
      console.log('LOGIN TEST FAILED ❌');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Script error:', error);
    mongoose.disconnect();
  }
}

testLogin();