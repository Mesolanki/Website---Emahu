const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const User = require('./models/User');

    const adminEmail = 'admin@emahu.com';

    // Delete existing admin@emahu.com user if any
    await User.deleteOne({ email: adminEmail });

    // Create super admin
    const admin = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: 'password123',
      role: 'admin',
      phone: '9876543210',
      isEmailVerified: true,
      isPhoneVerified: true,
      status: 'approved'
    });

    console.log('Seeded administrator credentials successfully:', {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      status: admin.status
    });

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
