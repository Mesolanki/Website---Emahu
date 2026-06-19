const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const User = require('./models/User');
    const users = await User.find();
    console.log("=== DB USERS ===");
    users.forEach(u => {
      console.log({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        isEmailVerified: u.isEmailVerified,
        isPhoneVerified: u.isPhoneVerified,
        isTwoFactorEnabled: u.isTwoFactorEnabled
      });
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
