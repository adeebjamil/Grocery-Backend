require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    const adminUser = await User.findOne({ email: 'adeeb@gmail.com' });
    
    if (adminUser) {
      console.log('Admin user found:');
      console.log({
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        isAdmin: adminUser.isAdmin,
        passwordExists: !!adminUser.password
      });
    } else {
      console.log('Admin user NOT found. Creating admin user...');
      
      // Create admin user if needed
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);
      
      const newAdmin = new User({
        name: 'Adeeb Jamil',
        email: 'adeeb@gmail.com',
        password: hashedPassword,
        isAdmin: true
      });
      
      await newAdmin.save();
      console.log('Admin user created successfully.');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkAdmin();