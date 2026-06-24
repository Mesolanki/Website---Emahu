require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function test() {
  console.log('Testing Resend email delivery...');
  const result = await sendEmail({
    to: 'mksolanki527@gmail.com',
    subject: 'EMAHU OTP Test - 123456',
    text: 'Your test OTP is: 123456\n\nThis is an automated test from EMAHU backend.',
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n✅ EMAIL SENT SUCCESSFULLY! Check your inbox.');
  } else {
    console.log('\n❌ EMAIL FAILED:', result.error);
  }
}

test().catch(e => console.error('Uncaught Error:', e));
