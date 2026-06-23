/**
 * Integration Test Script: verify_delivery.js
 * Automatically validates:
 * 1. Location-Based delivery partner registration (Ahmedabad vs Surat).
 * 2. Order assignment and city filtering ( Ahmedabad driver only sees Ahmedabad orders, etc.)
 * 3. Flat ₹2/KM delivery charge billing.
 * 4. Live location updates.
 * 5. Secure OTP confirmation flow:
 *    - Proximity checks (< 100m proximity verification).
 *    - Resend delay throttle (60s cooldown limit).
 *    - Verification attempts limit throttling (locked after 5 failures).
 * 6. No-OTP photo upload + Buyer-confirm flow.
 */

const PORT = process.env.TEST_PORT || '5000';
const BASE_URL = `http://localhost:${PORT}`;

async function requestAndVerifyOtp(email) {
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const sendData = await sendRes.json();
  if (!sendData.success) throw new Error(`Send OTP failed for ${email}: ${sendData.error}`);
  const otp = sendData.devOtp;
  if (!otp) throw new Error(`devOtp not returned in response. Make sure NODE_ENV=development`);
  
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) throw new Error(`Verify OTP failed for ${email}: ${verifyData.error}`);
}

async function runTests() {
  console.log('🚀 Starting Integration Tests for Delivery Management System...');
  const testId = Date.now();
  
  // Credentials
  const buyerEmail = `test_buyer_${testId}@emahu.com`;
  const sellerEmail = `test_seller_${testId}@emahu.com`;
  const partnerAhdEmail = `partner_ahd_${testId}@emahu.com`;
  const partnerSuratEmail = `partner_surat_${testId}@emahu.com`;
  const adminEmail = `admin_delivery_${testId}@emahu.com`;

  let buyerToken, sellerToken, partnerAhdToken, partnerSuratToken, adminToken;
  let buyerId, sellerId, partnerAhdId, partnerSuratId;
  let orderAhdId, orderSuratId;

  const mongoose = require('mongoose');
  const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/emahu';

  // Load models in current process to compile schemas
  const User = require('./models/User');
  const Order = require('./models/Order');
  const DeliveryAssignment = require('./models/DeliveryAssignment');
  const DeliveryTracking = require('./models/DeliveryTracking');
  const Otp = require('./models/Otp');

  try {
    console.log('👉 Connecting to MongoDB for pre-test cleanup...');
    await mongoose.connect(dbUri);

    console.log('🧹 Cleaning up old test data to prevent pollution...');
    await User.deleteMany({
      $or: [
        { email: /emahu\.com/i },
        { email: /thiefness\.com/i },
        { name: /^sd$/i }
      ]
    });
    await Order.deleteMany({
      $or: [
        { 'deliveryAddress.email': /emahu\.com/i },
        { sellerEmail: /emahu\.com/i }
      ]
    });
    await DeliveryAssignment.deleteMany({});
    await DeliveryTracking.deleteMany({});
    await Otp.deleteMany({});
    console.log('✅ Pre-test database cleanup completed.');
    // -------------------------------------------------------------------------
    // 1. REGISTER USERS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Registering Users ---');

    // Register Admin
    await requestAndVerifyOtp(adminEmail);
    const adminReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delivery Admin',
        email: adminEmail,
        password: 'password123',
        role: 'admin',
        adminSecret: 'emahu_admin_secret_key_2026'
      })
    });
    const adminRegData = await adminReg.json();
    if (!adminRegData.success) throw new Error('Admin registration failed: ' + adminRegData.error);
    
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'password123' })
    });
    adminToken = (await adminLogin.json()).accessToken;
    console.log('✅ Admin registered and logged in.');

    // Register Buyer
    await requestAndVerifyOtp(buyerEmail);
    const buyerReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Buyer Ramesh',
        email: buyerEmail,
        password: 'password123',
        role: 'buyer',
        phone: '9999999991'
      })
    });
    const buyerRegData = await buyerReg.json();
    buyerId = buyerRegData.user._id || buyerRegData.user.id;

    const buyerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, password: 'password123' })
    });
    buyerToken = (await buyerLogin.json()).accessToken;
    console.log(`✅ Buyer registered. ID: ${buyerId}`);

    // Register Seller
    await requestAndVerifyOtp(sellerEmail);
    const sellerReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Seller Gota Retail',
        email: sellerEmail,
        password: 'password123',
        role: 'seller',
        storeName: `Gota Electronics ${testId}`,
        category: 'Electronics',
        phone: '9876543210'
      })
    });
    const sellerRegData = await sellerReg.json();
    sellerId = sellerRegData.user._id || sellerRegData.user.id;

    // Approve Seller
    await fetch(`${BASE_URL}/api/auth/admin/sellers/${sellerId}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ decision: 'approve' })
    });

    const sellerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sellerEmail, password: 'password123' })
    });
    sellerToken = (await sellerLogin.json()).accessToken;
    console.log(`✅ Seller registered and approved. ID: ${sellerId}`);

    // Register Ahmedabad Driver Partner
    await requestAndVerifyOtp(partnerAhdEmail);
    const partnerAhdReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ahd Driver Amit',
        email: partnerAhdEmail,
        password: 'password123',
        role: 'delivery',
        phone: '8888888881',
        category: 'single_two_boy',
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
        address: 'Gota Ahmedabad'
      })
    });
    const partnerAhdRegData = await partnerAhdReg.json();
    partnerAhdId = partnerAhdRegData.user?._id || partnerAhdRegData.user?.id;

    const partnerAhdLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: partnerAhdEmail, password: 'password123' })
    });
    partnerAhdToken = (await partnerAhdLogin.json()).accessToken;
    console.log(`✅ Ahmedabad Driver registered. ID: ${partnerAhdId}`);

    // Approve Ahmedabad Driver via admin decision
    await fetch(`${BASE_URL}/api/auth/admin/delivery-partners/${partnerAhdId}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ decision: 'approve' })
    });
    console.log('✅ Ahmedabad Driver approved by admin.');

    // Register Surat Driver Partner
    await requestAndVerifyOtp(partnerSuratEmail);
    const partnerSuratReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Surat Driver Sunil',
        email: partnerSuratEmail,
        password: 'password123',
        role: 'delivery',
        phone: '8888888882',
        category: 'single_two_boy',
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
        address: 'Adajan Surat'
      })
    });
    const partnerSuratRegData = await partnerSuratReg.json();
    partnerSuratId = partnerSuratRegData.user?._id || partnerSuratRegData.user?.id;

    const partnerSuratLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: partnerSuratEmail, password: 'password123' })
    });
    partnerSuratToken = (await partnerSuratLogin.json()).accessToken;
    console.log(`✅ Surat Driver registered. ID: ${partnerSuratId}`);

    // Approve Surat Driver via admin decision
    await fetch(`${BASE_URL}/api/auth/admin/delivery-partners/${partnerSuratId}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ decision: 'approve' })
    });
    console.log('✅ Surat Driver approved by admin.');

    // -------------------------------------------------------------------------
    // 2. CREATE TEST ORDERS (Ahmedabad vs Surat)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Creating Test Orders ---');

    // Order 1: Ahmedabad seller and buyer address (Should auto-detect Ahmedabad)
    const orderAhdRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({
        userId: buyerId,
        sellerId: sellerId,
        sellerEmail: sellerEmail,
        items: [{ productId: 'prod_mock_sound', name: 'Soundbar', price: 5000, quantity: 1, brand: 'Sony' }],
        productAmount: 5000,
        distanceKm: 12.5, // 12.5 KM
        shippingSpeed: 'standard',
        escrowMethod: 'wallet',
        deliveryAddress: {
          fullName: 'Amit Patel',
          phone: '9998887776',
          email: buyerEmail,
          address: 'Shivalik Heights, Gota',
          city: 'Ahmedabad',
          stateName: 'Gujarat',
          pincode: '382481'
        },
        sellerLocation: { latitude: 23.0754, longitude: 72.5273 }, // Seller in Gota
        buyerLocation: { latitude: 23.0805, longitude: 72.5312 }   // Buyer nearby Gota
      })
    });
    const orderAhdData = await orderAhdRes.json();
    orderAhdId = orderAhdData.order.orderId;
    console.log(`✅ Ahmedabad Order Created. ID: ${orderAhdId}. Delivery Charge: ₹${orderAhdData.order.deliveryCharge}`);
    
    // Verify distance calculation billing (12.5 KM * ₹2 = ₹25)
    if (orderAhdData.order.deliveryCharge !== 25) {
      throw new Error(`Expected delivery charge to be ₹25 (12.5 KM * ₹2), but got ₹${orderAhdData.order.deliveryCharge}`);
    }
    console.log(`✅ Flat ₹2/KM distance billing verified successfully.`);

    // Order 2: Surat address (Should auto-detect Surat)
    const orderSuratRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({
        userId: buyerId,
        sellerId: sellerId,
        sellerEmail: sellerEmail,
        items: [{ productId: 'prod_mock_watch', name: 'Luxury Watch', price: 15000, quantity: 1, brand: 'Titan' }],
        productAmount: 15000,
        distanceKm: 8.0, // 8.0 KM
        shippingSpeed: 'standard',
        escrowMethod: 'wallet',
        deliveryAddress: {
          fullName: 'Bhavin Shah',
          phone: '9998887775',
          email: buyerEmail,
          address: 'Adajan Road',
          city: 'Surat',
          stateName: 'Gujarat',
          pincode: '395009'
        },
        sellerLocation: { latitude: 21.1852, longitude: 72.8012 }, // Surat Seller
        buyerLocation: { latitude: 21.1925, longitude: 72.7985 }   // Surat Buyer
      })
    });
    const orderSuratData = await orderSuratRes.json();
    orderSuratId = orderSuratData.order.orderId;
    console.log(`✅ Surat Order Created. ID: ${orderSuratId}. Delivery Charge: ₹${orderSuratData.order.deliveryCharge}`);

    // Mark both orders as APPROVED by seller to make them eligible for delivery queues
    await fetch(`${BASE_URL}/api/orders/${orderAhdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', sellerConfirmed: true })
    });
    await fetch(`${BASE_URL}/api/orders/${orderSuratId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', sellerConfirmed: true })
    });
    console.log('✅ Both test orders approved by seller.');

    // -------------------------------------------------------------------------
    // 3. CITY FILTERING CHECKS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Verifying City-Based Filtering ---');

    // Fetch Ahmedabad driver's queue
    const queueAhdRes = await fetch(`${BASE_URL}/api/delivery/my-orders`, {
      headers: { 'Authorization': `Bearer ${partnerAhdToken}` }
    });
    const queueAhdData = await queueAhdRes.json();
    const ahdAvailableIds = (queueAhdData.availableOrders || []).map(o => o.orderId);
    const ahdAssignedIds = (queueAhdData.orders || []).map(o => o.orderId);
    const ahdAllIds = [...ahdAvailableIds, ...ahdAssignedIds];
    console.log(`Ahmedabad driver available orders: ${JSON.stringify(ahdAvailableIds)}, assigned: ${JSON.stringify(ahdAssignedIds)}`);

    if (!ahdAllIds.includes(orderAhdId)) {
      throw new Error(`Expected Ahmedabad order #${orderAhdId} in Ahmedabad driver queue.`);
    }
    if (ahdAllIds.includes(orderSuratId)) {
      throw new Error(`Surat order #${orderSuratId} should NOT appear in Ahmedabad driver queue.`);
    }
    console.log('✅ Ahmedabad driver filtering passed.');

    // Fetch Surat driver's queue
    const queueSuratRes = await fetch(`${BASE_URL}/api/delivery/my-orders`, {
      headers: { 'Authorization': `Bearer ${partnerSuratToken}` }
    });
    const queueSuratData = await queueSuratRes.json();
    const suratAvailableIds = (queueSuratData.availableOrders || []).map(o => o.orderId);
    const suratAssignedIds = (queueSuratData.orders || []).map(o => o.orderId);
    const suratAllIds = [...suratAvailableIds, ...suratAssignedIds];
    console.log(`Surat driver available orders: ${JSON.stringify(suratAvailableIds)}, assigned: ${JSON.stringify(suratAssignedIds)}`);

    if (!suratAllIds.includes(orderSuratId)) {
      throw new Error(`Expected Surat order #${orderSuratId} in Surat driver queue.`);
    }
    if (suratAllIds.includes(orderAhdId)) {
      throw new Error(`Ahmedabad order #${orderAhdId} should NOT appear in Surat driver queue.`);
    }
    console.log('✅ Surat driver filtering passed.');

    // -------------------------------------------------------------------------
    // 4. ORDER TRANSITIONS & LOCATION UPDATES
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Order Status Flows & Live Location Updates ---');

    // Ahmedabad driver accepts Ahmedabad order
    const acceptRes = await fetch(`${BASE_URL}/api/delivery/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, status: 'accepted' })
    });
    const acceptData = await acceptRes.json();
    if (!acceptData.success) throw new Error('Accept job failed');
    console.log('✅ Ahmedabad driver accepted order.');

    // Driver broadcasts live location update
    const locUpdateRes = await fetch(`${BASE_URL}/api/delivery/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, latitude: 23.0760, longitude: 72.5280 })
    });
    const locUpdateData = await locUpdateRes.json();
    if (!locUpdateData.success) throw new Error('Live location update failed');
    console.log('✅ Live GPS coordinates updated successfully.');

    // Check live tracking details retrieval
    const trackDetailsRes = await fetch(`${BASE_URL}/api/delivery/track/live/${orderAhdId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const trackDetails = await trackDetailsRes.json();
    if (!trackDetails.success) throw new Error('Get tracking details failed');
    console.log(`✅ Live details retrieved. Courier GPS: ${JSON.stringify(trackDetails.partnerLocation)}. Remaining Distance: ${trackDetails.remainingDistanceKm} KM. ETA: ${trackDetails.etaMinutes} mins.`);

    // -------------------------------------------------------------------------
    // 5. SECURE OTP CONFIRMATION & GPS PROXIMITY GUARDS
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Secure OTP Confirmation & Proximity Guards ---');

    // Driver advances status to In Transit, then Arrived
    await fetch(`${BASE_URL}/api/delivery/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, status: 'in_transit' })
    });
    await fetch(`${BASE_URL}/api/delivery/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, status: 'arrived' })
    });
    console.log('✅ Driver transitioned status to ARRIVED.');

    // Proximity Test: Driver triggers OTP from a distant location (mocking Mumbai coords)
    console.log('👉 Testing GPS Proximity guard (Mumbai vs Ahmedabad)...');
    const otpFailRes = await fetch(`${BASE_URL}/api/delivery/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, latitude: 19.0760, longitude: 72.8777 }) // Mumbai
    });
    const otpFailData = await otpFailRes.json();
    if (otpFailRes.status === 400) {
      console.log('✅ GPS proximity guard blocked the request (Correct). Error: ' + otpFailData.error);
    } else {
      throw new Error(`Expected 400 Bad Request due to proximity failure, but got ${otpFailRes.status}`);
    }

    // Success Proximity: Driver is within 100m of buyer location (23.0805, 72.5312)
    console.log('👉 Testing GPS Proximity guard (Within 100m of buyer)...');
    const otpSuccessRes = await fetch(`${BASE_URL}/api/delivery/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, latitude: 23.0804, longitude: 72.5311 }) // < 20 meters away
    });
    const otpSuccessData = await otpSuccessRes.json();
    if (!otpSuccessRes.ok) throw new Error('Send OTP within 100m failed: ' + JSON.stringify(otpSuccessData));
    console.log('✅ OTP code generated and sent successfully.');

    // Throttle Test: Request immediately again (cooldown check)
    console.log('👉 Testing 60s OTP Resend throttle...');
    const throttleRes = await fetch(`${BASE_URL}/api/delivery/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({ orderId: orderAhdId, latitude: 23.0804, longitude: 72.5311 })
    });
    const throttleData = await throttleRes.json();
    if (throttleRes.status === 429) {
      console.log('✅ Cooldown throttle blocked resend (Correct). Message: ' + throttleData.error);
    } else {
      throw new Error(`Expected 429 Rate Limit for resend, got ${throttleRes.status}`);
    }

    // Fetch the generated OTP from Otp collection (since we are in development, devOtp is returned in send response or verified in DB)
    // Wait, let's look at the database Otp model to see if we can get it, or since devOtp is only in auth send-otp, we can check how we verify.
    // In our backend sendDeliveryOtp, does it return the code if NODE_ENV=development?
    // Let's check: in backend/controllers/deliveryController.js, did we return the code?
    // Let's search controllers/deliveryController.js for sendDeliveryOtp return fields.
    // Actually, in the test mode, since we can't read the email, let's check if the OTP can be fetched or if there's a devOtp field.
    // Let's look at the database using a check script, or we can fetch the OTP from the Otp collection directly!
    // Since verify_delivery.js runs locally, it can connect to Mongoose and extract the active OTP code!
    // Let's see: yes! We can require Mongoose, load the Otp model, and fetch the otp code!
    console.log('👉 Querying MongoDB to fetch active OTP code...');
    const otpDoc = await Otp.findOne({ email: buyerEmail }).sort({ createdAt: -1 });
    if (!otpDoc) throw new Error('OTP document not found in MongoDB!');
    const activeOtp = otpDoc.otp;
    console.log(`🔑 Retrieved active OTP code from DB: ${activeOtp}`);

    // Incorrect attempts throttling test
    console.log('👉 Testing incorrect OTP attempts throttling (Fail 5 times)...');
    for (let attempt = 1; attempt <= 5; attempt++) {
      const wrongVerifyRes = await fetch(`${BASE_URL}/api/delivery/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
        body: JSON.stringify({
          orderId: orderAhdId,
          otp: '999999', // wrong OTP
          deliveryPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
          latitude: 23.0804,
          longitude: 72.5311
        })
      });
      const wrongData = await wrongVerifyRes.json();
      console.log(`   Attempt ${attempt} response (status ${wrongVerifyRes.status}): ${wrongData.error}`);
    }

    // 6th attempt should block immediately with "Too many incorrect attempts"
    console.log('👉 Testing 6th attempt lock...');
    const sixthRes = await fetch(`${BASE_URL}/api/delivery/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({
        orderId: orderAhdId,
        otp: activeOtp, // correct OTP, but should still be locked out!
        deliveryPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
        latitude: 23.0804,
        longitude: 72.5311
      })
    });
    const sixthData = await sixthRes.json();
    if (sixthRes.status === 400 && sixthData.error.includes('Too many incorrect attempts')) {
      console.log('✅ OTP lock throttled correct entries after 5 failures (Correct Behavior). Message: ' + sixthData.error);
    } else {
      throw new Error(`Expected 400 lock with Too many incorrect attempts, got status ${sixthRes.status}`);
    }

    // Reset attempts in database to test successful validation
    await Otp.updateOne({ email: buyerEmail }, { $set: { attempts: 0 } });
    console.log('👉 Resetting failures in MongoDB to verify successful OTP handover...');

    // Proximity Verify: Try to verify OTP from distant location (Mumbai coords)
    console.log('👉 Testing GPS Proximity guard during verification...');
    const verifyFailGpsRes = await fetch(`${BASE_URL}/api/delivery/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({
        orderId: orderAhdId,
        otp: activeOtp,
        deliveryPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
        latitude: 19.0760,
        longitude: 72.8777
      })
    });
    const verifyFailGpsData = await verifyFailGpsRes.json();
    if (verifyFailGpsRes.status === 400 && verifyFailGpsData.error.includes('GPS Proximity Verification Failed')) {
      console.log('✅ GPS verification guard blocked validation correctly. Error: ' + verifyFailGpsData.error);
    } else {
      throw new Error(`Expected GPS verification error, got status ${verifyFailGpsRes.status}`);
    }

    // Success verify
    console.log('👉 Testing successful OTP verify within 100m...');
    const finalVerifyRes = await fetch(`${BASE_URL}/api/delivery/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerAhdToken}` },
      body: JSON.stringify({
        orderId: orderAhdId,
        otp: activeOtp,
        deliveryPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
        latitude: 23.0804,
        longitude: 72.5311
      })
    });
    const finalVerifyData = await finalVerifyRes.json();
    if (!finalVerifyRes.ok) throw new Error('Verify OTP failed: ' + JSON.stringify(finalVerifyData));
    console.log('✅ Delivery OTP verification succeeded. Order status changed to DELIVERED.');

    // -------------------------------------------------------------------------
    // 6. NO-OTP PHOTO UPLOAD + BUYER CONFIRM FLOW
    // -------------------------------------------------------------------------
    console.log('\n--- 6. No-OTP Photo Upload + Buyer-Confirm Flow ---');

    // Surat driver accepts Surat order
    await fetch(`${BASE_URL}/api/delivery/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerSuratToken}` },
      body: JSON.stringify({ orderId: orderSuratId, status: 'accepted' })
    });
    await fetch(`${BASE_URL}/api/delivery/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerSuratToken}` },
      body: JSON.stringify({ orderId: orderSuratId, status: 'picked_up' })
    });
    await fetch(`${BASE_URL}/api/delivery/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerSuratToken}` },
      body: JSON.stringify({ orderId: orderSuratId, status: 'in_transit' })
    });
    console.log('✅ Surat driver accepted, picked up, and transit started.');

    // Courier arrives at Surat buyer location and uploads photo (within 100m of buyer location: 21.1925, 72.7985)
    console.log('👉 Courier uploading package photo for Method B...');
    const photoUploadRes = await fetch(`${BASE_URL}/api/delivery/photo/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerSuratToken}` },
      body: JSON.stringify({
        orderId: orderSuratId,
        deliveryPhoto: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80',
        latitude: 21.1924,
        longitude: 72.7984
      })
    });
    const photoUploadData = await photoUploadRes.json();
    if (!photoUploadRes.ok) throw new Error('Photo upload failed: ' + JSON.stringify(photoUploadData));
    console.log(`✅ Package photo uploaded. Order deliveryStatus updated to: ${photoUploadData.order.deliveryStatus}`);

    // Verify status is now 'arrived' / 'ARRIVED'
    if (photoUploadData.order.deliveryStatus !== 'arrived' || photoUploadData.order.status !== 'ARRIVED') {
      throw new Error(`Expected status to transition to ARRIVED/arrived, got ${photoUploadData.order.status}/${photoUploadData.order.deliveryStatus}`);
    }

    // Buyer confirms receipt from their dashboard
    console.log('👉 Buyer confirming package receipt on dashboard...');
    const buyerConfirmRes = await fetch(`${BASE_URL}/api/orders/${orderSuratId}/confirm-receipt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` }
    });
    const buyerConfirmData = await buyerConfirmRes.json();
    if (!buyerConfirmRes.ok) throw new Error('Buyer confirmation failed: ' + JSON.stringify(buyerConfirmData));
    console.log(`✅ Buyer receipt confirmed. Order deliveryStatus transitions to: ${buyerConfirmData.order.deliveryStatus}`);

    if (buyerConfirmData.order.status !== 'DELIVERED' || buyerConfirmData.order.deliveryStatus !== 'delivered') {
      throw new Error(`Expected final status to be DELIVERED, got ${buyerConfirmData.order.status}/${buyerConfirmData.order.deliveryStatus}`);
    }
    console.log('✅ No-OTP photo confirm flow verified successfully.');

    await mongoose.disconnect();
    console.log('\n🎉 ALL LOGISTICS & DELIVERY INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    try {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

runTests();
