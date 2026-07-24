const mongoose = require('mongoose');
require('dotenv').config();

const searchId = '6a310a595930e94b9f456e01';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const User = require('./models/User');
    const user = await User.findById(searchId);
    console.log("=== SEARCH USER RESULT ===");
    console.log(user ? {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    } : 'NULL (User not found!)');

    // Also search by email admin@emahu.com to see all accounts with this email
    const admins = await User.find({ email: 'admin@emahu.com' });
    console.log("=== ADMIN ACCOUNTS ===");
    admins.forEach(admin => {
      console.log({
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      });
    });

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
