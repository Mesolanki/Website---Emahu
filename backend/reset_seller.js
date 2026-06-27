const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const User = require('./models/User');
    
    const u1 = await User.findOne({ email: 'test_seller_1782296616911@emahu.com' });
    if (u1) {
      u1.password = 'password123';
      await u1.save();
      console.log('Updated test_seller_1782296616911@emahu.com password to password123');
    }
    
    const u2 = await User.findOne({ email: 'jennah.2@liggegi.com' });
    if (u2) {
      u2.password = 'password123';
      await u2.save();
      console.log('Updated jennah.2@liggegi.com password to password123');
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
