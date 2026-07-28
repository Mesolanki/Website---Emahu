/**
 * restore_admin.js
 * Restores the super admin user in the Emahu database.
 * Run on the VPS with: node restore_admin.js
 *
 * This will:
 *  1. Delete any existing admin@emahu.com account
 *  2. Create a fresh super admin with verified status
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ADMIN_EMAIL    = 'admin@emahu.com';
const ADMIN_PASSWORD = 'Emahu@Admin2026'; // ← Change this after first login!
const ADMIN_NAME     = 'Super Admin';
const ADMIN_PHONE    = '9999999999';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    console.log('✅  MongoDB connected');

    const User = require('./models/User');

    // Remove existing admin account (if any)
    const deleted = await User.deleteOne({ email: ADMIN_EMAIL });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️  Removed stale admin account: ${ADMIN_EMAIL}`);
    }

    // Create fresh super admin
    const admin = await User.create({
      name:            ADMIN_NAME,
      email:           ADMIN_EMAIL,
      password:        ADMIN_PASSWORD,
      role:            'admin',
      phone:           ADMIN_PHONE,
      isEmailVerified: true,
      isPhoneVerified: true,
      status:          'approved'
    });

    console.log('\n🎉  Super Admin restored successfully!');
    console.log('─────────────────────────────────────────');
    console.log(`   ID     : ${admin._id}`);
    console.log(`   Email  : ${admin.email}`);
    console.log(`   Role   : ${admin.role}`);
    console.log(`   Status : ${admin.status}`);
    console.log('─────────────────────────────────────────');
    console.log(`   ⚠️  Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log('   ⚠️  Change your password immediately after login!\n');

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌  Error restoring admin:', err.message);
    process.exit(1);
  });
