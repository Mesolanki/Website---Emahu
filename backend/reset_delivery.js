const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const User = require('./models/User');
    
    const emails = [
      'partner_ahd_1782296616911@emahu.com',
      'partner_surat_1782296616911@emahu.com',
      'hera@liggegi.com',
      'leeanne@liggegi.com',
      'anujmihir123@gmail.com'
    ];

    for (const email of emails) {
      const u = await User.findOne({ email });
      if (u) {
        u.password = 'password123';
        await u.save();
        console.log(`Updated delivery partner ${email} password to password123`);
      }
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
