const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emahu';

async function seedAll() {
  try {
    console.log('Connecting to database:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.');

    const usersToSeed = [
      // 1. Admin
      {
        name: 'Super Admin',
        email: 'admin@emahu.com',
        password: 'password123',
        role: 'admin',
        phone: '9876543210',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'approved'
      },
      // 2. Sellers
      {
        name: 'Main Store Seller',
        email: 'qwert@test.com',
        password: 'password123',
        role: 'seller',
        phone: '9000011111',
        isEmailVerified: true,
        isPhoneVerified: true,
        storeName: 'Emahu General Store',
        category: 'Electronics & Tech',
        address: 'Emahu Tech Park, Block C, Bangalore, Karnataka',
        status: 'approved'
      },
      {
        name: 'KYC Test Seller',
        email: 'test_pending_seller@emahu.com',
        password: 'password123',
        role: 'seller',
        phone: '9876500001',
        isEmailVerified: true,
        isPhoneVerified: true,
        address: 'Shop No. 5, Gota Market, Gota, Ahmedabad, Gujarat - 382481',
        storeName: 'KYC Test Store',
        category: 'Electronics & Tech',
        status: 'pending'
      },
      {
        name: 'Jennah Seller',
        email: 'jennah.2@liggegi.com',
        password: 'password123',
        role: 'seller',
        phone: '9876500002',
        isEmailVerified: true,
        isPhoneVerified: true,
        storeName: 'Jennah Store',
        category: 'Apparel',
        address: 'Apparel Market, Surat',
        status: 'approved'
      },
      // 3. Delivery Partners
      {
        name: 'Ahd Driver Amit',
        email: 'partner_ahd_1782296616911@emahu.com',
        password: 'password123',
        role: 'delivery',
        phone: '8888888881',
        currentCity: 'Ahmedabad',
        coveredCities: ['Ahmedabad'],
        serviceAreaState: 'Gujarat',
        currentArea: 'Gota',
        pincode: '382481',
        latitude: 23.0800,
        longitude: 72.5310,
        perKmRate: 2,
        perItemCharge: 2,
        vehicleType: 'bike',
        vehicleNumber: 'GJ-01-AB-1234',
        address: 'Gota Ahmedabad',
        status: 'approved',
        isActivePartner: true
      },
      {
        name: 'Surat Driver Sunil',
        email: 'partner_surat_1782296616911@emahu.com',
        password: 'password123',
        role: 'delivery',
        phone: '8888888882',
        currentCity: 'Surat',
        coveredCities: ['Surat'],
        serviceAreaState: 'Gujarat',
        currentArea: 'Adajan',
        pincode: '395009',
        latitude: 21.1702,
        longitude: 72.8311,
        perKmRate: 2,
        perItemCharge: 2,
        vehicleType: 'bike',
        vehicleNumber: 'GJ-05-CD-5678',
        address: 'Adajan Surat',
        status: 'approved',
        isActivePartner: true
      },
      {
        name: 'Hera Delivery',
        email: 'hera@liggegi.com',
        password: 'password123',
        role: 'delivery',
        phone: '8888888883',
        currentCity: 'Ahmedabad',
        coveredCities: ['Ahmedabad'],
        status: 'approved',
        isActivePartner: true
      },
      {
        name: 'Leeanne Delivery',
        email: 'leeanne@liggegi.com',
        password: 'password123',
        role: 'delivery',
        phone: '8888888884',
        currentCity: 'Surat',
        coveredCities: ['Surat'],
        status: 'approved',
        isActivePartner: true
      },
      {
        name: 'Mihir Delivery',
        email: 'anujmihir123@gmail.com',
        password: 'password123',
        role: 'delivery',
        phone: '8888888885',
        currentCity: 'Ahmedabad',
        coveredCities: ['Ahmedabad'],
        status: 'approved',
        isActivePartner: true
      },
      // 4. Buyer
      {
        name: 'Emahu Buyer',
        email: 'buyer@emahu.com',
        password: 'password123',
        role: 'buyer',
        phone: '9999999999',
        isEmailVerified: true,
        isPhoneVerified: true,
        address: '123 Emahu Market Street, Ahmedabad',
        status: 'approved'
      }
    ];

    for (const u of usersToSeed) {
      await User.deleteOne({ email: u.email });
      const createdUser = await User.create(u);
      console.log(`✅ Seeded ${createdUser.role} user: ${createdUser.email}`);
    }

    console.log('\nAll users seeded successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

seedAll();
