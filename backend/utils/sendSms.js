const sendSms = async (options) => {
  const { to, body } = options;
  const cleanPhone = to.trim();

  // 1. Try Twilio configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  // 2. Try Fast2SMS configuration
  const fast2smsKey = process.env.FAST2SMS_API_KEY;

  console.log('\n=================================================');
  console.log(`📱  PREPARING OUTBOUND SMS TO: +91 ${cleanPhone}`);
  console.log(`📝  SMS BODY: ${body}`);
  console.log('=================================================\n');

  // Fast2SMS integration
  if (fast2smsKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: body,
          language: 'english',
          numbers: cleanPhone
        })
      });
      const data = await res.json();
      if (data.return) {
        console.log('✔️ SMS sent successfully via Fast2SMS');
        return { success: true, service: 'fast2sms' };
      } else {
        console.error('❌ Fast2SMS error:', data.message);
        return { success: false, error: data.message };
      }
    } catch (err) {
      console.error('❌ Fast2SMS network error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Twilio integration
  if (twilioSid && twilioAuthToken && twilioPhone) {
    try {
      const authString = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const formattedTo = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
      
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authString}`
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: (twilioPhone.trim().startsWith('+') || isNaN(twilioPhone.trim())) ? twilioPhone.trim() : `+${twilioPhone.trim()}`,
            Body: body
          })
        }
      );

      const data = await res.json();
      if (res.ok) {
        console.log(`✔️ SMS sent successfully via Twilio. SID: ${data.sid}`);
        return { success: true, messageId: data.sid, service: 'twilio' };
      } else {
        console.error('❌ Twilio API error:', data.message);
        return { success: false, error: data.message };
      }
    } catch (err) {
      console.error('❌ Twilio network error:', err.message);
      return { success: false, error: err.message };
    }
  }

  console.log('ℹ️ SMS credentials not configured in backend/.env. Simulated SMS logged above.');
  return { success: true, simulated: true };
};

module.exports = sendSms;
