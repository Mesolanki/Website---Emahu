/**
 * Integration Test Script: verify_endpoints.js
 * Automatically validates:
 * 1. Seller registration and pending status
 * 2. KYC document uploads and admin audits
 * 3. Product submission, admin SKU/code generation, and unique SKU checks
 * 4. Seller verification code activation
 * 5. Rejection limit validation (3 rejections delete the product)
 */

const BASE_URL = 'http://localhost:5000';

async function requestAndVerifyOtp(email) {
  // 1. Send OTP
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const sendData = await sendRes.json();
  if (!sendData.success) throw new Error(`Send OTP failed for ${email}: ${sendData.error}`);
  
  const otp = sendData.devOtp;
  if (!otp) throw new Error(`devOtp not returned in response. Make sure NODE_ENV=development`);
  
  // 2. Verify OTP
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) throw new Error(`Verify OTP failed for ${email}: ${verifyData.error}`);
}

async function runTests() {
  console.log('🚀 Starting Integration Tests for Emahu E-Commerce System...');
  
  const testId = Date.now();
  const sellerEmail = `test_seller_${testId}@emahu.com`;
  const adminEmail = `test_admin_${testId}@emahu.com`;
  
  let sellerToken = '';
  let adminToken = '';
  let sellerId = '';
  let productId = '';
  
  try {
    // -------------------------------------------------------------------------
    // 1. REGISTER ADMIN & SELLER
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Register Admin and Seller ---');
    
    // Send and verify OTP for Admin
    await requestAndVerifyOtp(adminEmail);
    console.log('✅ Admin OTP verified successfully.');

    // Register Admin
    const adminRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Administrator',
        email: adminEmail,
        password: 'password123',
        role: 'admin',
        adminSecret: 'emahu_admin_secret_key_2026'
      })
    });
    const adminRegData = await adminRegRes.json();
    if (!adminRegData.success) throw new Error('Admin registration failed: ' + adminRegData.error);
    console.log('✅ Admin registered successfully.');

    // Login Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'password123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginData.success) throw new Error('Admin login failed: ' + JSON.stringify(adminLoginData));
    adminToken = adminLoginData.accessToken;
    console.log('✅ Admin logged in. Token acquired.');

    // Send and verify OTP for Seller
    await requestAndVerifyOtp(sellerEmail);
    console.log('✅ Seller OTP verified successfully.');

    // Register Seller (Should default to 'pending' status)
    const sellerRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Seller Merchant',
        email: sellerEmail,
        password: 'password123',
        role: 'seller',
        storeName: `Test Store ${testId}`,
        category: 'Electronics',
        phone: '9876543210',
        kycType: 'pan',
        kycNumber: 'ABCDE1234F',
        bankHolder: 'Test Seller Merchant',
        bankName: 'State Bank of India',
        accountNumber: '100020003000',
        ifscCode: 'SBIN0001234',
        gstNumber: '27AAAAA1111A1Z1'
      })
    });
    const sellerRegData = await sellerRegRes.json();
    if (!sellerRegData.success) throw new Error('Seller registration failed: ' + sellerRegData.error);
    sellerId = sellerRegData.user._id || sellerRegData.user.id;
    console.log(`✅ Seller registered successfully. ID: ${sellerId}. Status: ${sellerRegData.user.status}`);
    if (sellerRegData.user.status !== 'pending') {
      throw new Error(`Expected seller status 'pending', got '${sellerRegData.user.status}'`);
    }

    // Login Seller
    const sellerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sellerEmail,
        password: 'password123'
      })
    });
    const sellerLoginData = await sellerLoginRes.json();
    if (!sellerLoginData.success) throw new Error('Seller login failed');
    sellerToken = sellerLoginData.accessToken;
    console.log('✅ Seller logged in. Token acquired.');

    // -------------------------------------------------------------------------
    // 2. KYC DOCUMENT UPLOADS & AUDITS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. KYC Documents Upload and Audit ---');

    // Upload a Business registration document as Seller
    const docUploadRes = await fetch(`${BASE_URL}/api/auth/seller/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        documentType: 'business_registration',
        fileUrl: 'http://example.com/test_doc.pdf'
      })
    });
    const docUploadData = await docUploadRes.json();
    if (!docUploadData.success) throw new Error('Document upload failed: ' + docUploadData.error);
    const docId = docUploadData.document._id || docUploadData.document.id;
    console.log(`✅ Document uploaded. ID: ${docId}. Status: ${docUploadData.document.status}`);

    // Admin views Seller documents
    const adminGetDocsRes = await fetch(`${BASE_URL}/api/auth/admin/sellers/${sellerId}/documents`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminGetDocsData = await adminGetDocsRes.json();
    if (!adminGetDocsData.success || adminGetDocsData.documents.length === 0) {
      throw new Error('Admin failed to retrieve seller documents');
    }
    console.log('✅ Admin successfully retrieved documents checklist.');

    // Admin approves the document
    const docAuditRes = await fetch(`${BASE_URL}/api/auth/admin/sellers/${sellerId}/documents/${docId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'approved' })
    });
    const docAuditData = await docAuditRes.json();
    if (!docAuditData.success || docAuditData.document.status !== 'approved') {
      throw new Error('Admin document audit failed');
    }
    console.log('✅ Admin successfully approved seller document.');

    // Admin approves the Seller Account status
    const sellerDecisionRes = await fetch(`${BASE_URL}/api/auth/admin/sellers/${sellerId}/decision`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ decision: 'approve' })
    });
    const sellerDecisionData = await sellerDecisionRes.json();
    if (!sellerDecisionData.success || sellerDecisionData.seller.status !== 'approved') {
      throw new Error('Admin seller approval decision failed');
    }
    console.log('✅ Admin successfully approved seller account. Status is now approved.');

    // -------------------------------------------------------------------------
    // 3. PRODUCT LISTING SUBMISSION & ADMIN DECISION (APPROVE/SKU/CODE)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Product Listing, SKU assignment, and verification code flow ---');

    // Seller submits a new product
    const productCreateRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        name: 'Verified High-End Sound System',
        brand: 'AcousticPro',
        category: 'Electronics',
        price: 49999,
        comparePrice: 59999,
        stock: 15,
        description: 'Military-grade high fidelity stereo sound system with active noise cancellation.',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'
      })
    });
    const productCreateData = await productCreateRes.json();
    if (!productCreateData.success) throw new Error('Product listing creation failed: ' + productCreateData.error);
    productId = productCreateData.product._id || productCreateData.product.id;
    console.log(`✅ Product listed. ID: ${productId}. Status: ${productCreateData.product.approvalStatus}. Temp SKU: ${productCreateData.product.sku}`);

    // Admin approves product & assigns official SKU (SKU: EM-ACOUSTIC-{testId})
    const testSku = 'EM-ACOUSTIC-' + testId;
    const productDecisionRes = await fetch(`${BASE_URL}/api/products/${productId}/admin-decision`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        decision: 'approve',
        sku: testSku
      })
    });
    const productDecisionData = await productDecisionRes.json();
    if (!productDecisionData.success) throw new Error('Product decision failed: ' + productDecisionData.error);
    const adminCode = productDecisionData.product.adminCode;
    console.log(`✅ Product approved by admin. Official SKU: ${productDecisionData.product.sku}. Code Generated: ${adminCode}`);

    // Verify that the product is NOT live yet (needs seller verification code)
    if (productDecisionData.product.approvalStatus !== 'pending') {
      throw new Error(`Expected product status 'pending' before seller code activation, got '${productDecisionData.product.approvalStatus}'`);
    }

    // Try creating another product with the same SKU (should fail with 400 due to SKU uniqueness check)
    console.log('👉 Validating unique SKU checks...');
    const duplicateProductRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        name: 'Another Sound System',
        brand: 'AcousticPro',
        category: 'Electronics',
        price: 35000,
        comparePrice: 40000,
        stock: 5,
        description: 'Stereo speakers.',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'
      })
    });
    const duplicateProductData = await duplicateProductRes.json();
    if (!duplicateProductData.success) throw new Error('Failed to list duplicate dummy product');
    const duplicateId = duplicateProductData.product._id || duplicateProductData.product.id;

    // Admin attempts to assign the duplicate SKU (using testSku to test unique constraint)
    const duplicateDecisionRes = await fetch(`${BASE_URL}/api/products/${duplicateId}/admin-decision`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        decision: 'approve',
        sku: testSku // Duplicate SKU
      })
    });
    const duplicateDecisionData = await duplicateDecisionRes.json();
    if (duplicateDecisionRes.status === 400) {
      console.log('✅ Duplicate SKU assignment rejected with 400 bad request (Correct Behavior). Message: ' + duplicateDecisionData.error);
    } else {
      throw new Error('Expected 400 error on duplicate SKU assignment, got status ' + duplicateDecisionRes.status);
    }

    // -------------------------------------------------------------------------
    // 4. SELLER CODE VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Seller verification code submission ---');
    const verifyCodeRes = await fetch(`${BASE_URL}/api/products/${productId}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({ code: adminCode })
    });
    const verifyCodeData = await verifyCodeRes.json();
    if (!verifyCodeData.success || verifyCodeData.product.approvalStatus !== 'approved') {
      throw new Error('Seller product activation code verification failed');
    }
    console.log(`✅ Code verified successfully. Product status is now approved (Live).`);

    // Verify product is now visible on public GET /api/products
    const publicProductsRes = await fetch(`${BASE_URL}/api/products`);
    const publicProductsData = await publicProductsRes.json();
    const isLive = publicProductsData.products.some(p => (p._id || p.id) === productId);
    if (!isLive) throw new Error('Verified product is not showing in public products list!');
    console.log('✅ Product successfully listed live in public marketplace catalog!');

    // -------------------------------------------------------------------------
    // 5. PRODUCT REJECTION LIMIT VALIDATION (3 TIMES = PERMANENT DELETE)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Reject Product Limit Validation (3 times = permanent delete) ---');
    
    // Create new test product
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        name: 'Fragile Glass Ornament',
        brand: 'GlassCo',
        category: 'Home',
        price: 999,
        comparePrice: 1999,
        stock: 50,
        description: 'Delicate hand-blown glass ornament.',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80'
      })
    });
    const prodData = await prodRes.json();
    const limitProductId = prodData.product._id || prodData.product.id;
    console.log(`Created product for rejection limit test. ID: ${limitProductId}. Attempts: ${prodData.product.approvalAttempts}`);

    // Rejection 1
    const rej1Res = await fetch(`${BASE_URL}/api/products/${limitProductId}/admin-decision`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ decision: 'reject', reason: 'Unprofessional images' })
    });
    const rej1Data = await rej1Res.json();
    console.log(`Rejection 1 completed. Status: ${rej1Data.product.approvalStatus}. Attempts: ${rej1Data.product.approvalAttempts}`);

    // Rejection 2
    const rej2Res = await fetch(`${BASE_URL}/api/products/${limitProductId}/admin-decision`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ decision: 'reject', reason: 'Incorrect price details' })
    });
    const rej2Data = await rej2Res.json();
    console.log(`Rejection 2 completed. Status: ${rej2Data.product.approvalStatus}. Attempts: ${rej2Data.product.approvalAttempts}`);

    // Rejection 3 (Should delete product permanently)
    const rej3Res = await fetch(`${BASE_URL}/api/products/${limitProductId}/admin-decision`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ decision: 'reject', reason: 'Spam listing' })
    });
    const rej3Data = await rej3Res.json();
    console.log(`Rejection 3 completed. Deleted status: ${rej3Data.productDeleted}. Message: ${rej3Data.message}`);

    if (!rej3Data.productDeleted) {
      throw new Error('Expected product to be deleted on 3rd rejection, but productDeleted flag is false');
    }

    // Verify it is not in the DB
    const checkProductRes = await fetch(`${BASE_URL}/api/products/my`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` }
    });
    const checkProductData = await checkProductRes.json();
    const stillExists = checkProductData.products.some(p => (p._id || p.id) === limitProductId);
    if (stillExists) {
      throw new Error('Rejection limit test failed: product still exists in seller list after 3 rejections!');
    }
    console.log('✅ Rejection limit test passed successfully. Product was deleted permanently.');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

runTests();
