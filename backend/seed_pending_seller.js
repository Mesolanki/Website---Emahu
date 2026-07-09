const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emahu')
  .then(async () => {
    const User = require('./models/User');
    const SellerDocument = require('./models/SellerDocument');

    const testEmail = 'test_pending_seller@emahu.com';

    // Cleanup existing test kyc seller
    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) {
      await SellerDocument.deleteMany({ seller: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
      console.log('Cleared existing pending seller profile.');
    }

    // Create seller in pending status
    const seller = await User.create({
      name: 'KYC Test Seller',
      email: testEmail,
      password: 'password123',
      role: 'seller',
      phone: '9876500001',
      isEmailVerified: true,
      isPhoneVerified: true,
      address: 'Shop No. 5, Gota Market, Gota, Ahmedabad, Gujarat - 382481',
      storeName: 'KYC Test Store',
      category: 'Electronics & Tech',
      kycType: 'pan',
      kycNumber: 'ABCDE1234F',
      bankHolder: 'KYC Test Seller',
      accountNumber: '123456789012',
      ifscCode: 'SBIN0001234',
      bankName: 'State Bank of India',
      status: 'pending'
    });

    console.log('Created pending test seller:', {
      id: seller._id,
      email: seller.email,
      status: seller.status
    });

    // Create pending KYC documents
    const docUrl = 'http://localhost:5000/api/auth/kyc_document.jpg';
    const gstUrl = 'http://localhost:5000/api/auth/gst_certificate_stub.pdf';

    await SellerDocument.create({
      seller: seller._id,
      documentType: 'id_proof',
      fileUrl: docUrl,
      status: 'pending'
    });

    await SellerDocument.create({
      seller: seller._id,
      documentType: 'business_registration',
      fileUrl: gstUrl,
      status: 'pending'
    });

    console.log('Seeded pending ID Proof & Business Registration documents.');

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
