const sendEmail = require('./utils/sendEmail');
require('dotenv').config();

async function test() {
  console.log('Testing SMTP connection and sending a test mail...');
  const res = await sendEmail({
    to: 'mksolanki527@gmail.com',
    subject: 'SMTP Connection Test',
    text: 'If you receive this, the nodemailer SMTP credentials are correct and email sending works!'
  });
  console.log('Result:', res);
}

test();
