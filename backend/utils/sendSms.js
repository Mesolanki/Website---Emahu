const sendSms = async (options) => {
  const { to, body } = options;
  const cleanPhone = to.trim();

  // 1. Try Twilio configuration (ignore placeholder values)
  const twilioSid = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.trim() !== '' && process.env.TWILIO_ACCOUNT_SID.trim() !== 'your-twilio-account-sid') ? process.env.TWILIO_ACCOUNT_SID.trim() : '';
  const twilioAuthToken = (process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.trim() !== '' && process.env.TWILIO_AUTH_TOKEN.trim() !== 'your-twilio-auth-token') ? process.env.TWILIO_AUTH_TOKEN.trim() : '';
  const twilioPhone = (process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER.trim() !== '' && process.env.TWILIO_PHONE_NUMBER.trim() !== 'your-twilio-phone-number') ? process.env.TWILIO_PHONE_NUMBER.trim() : '';

  // 2. Try Fast2SMS configuration (ignore placeholder values)
  const fast2smsKey = (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim() !== '' && process.env.FAST2SMS_API_KEY.trim() !== 'your-fast2sms-api-key') ? process.env.FAST2SMS_API_KEY.trim() : '';

  // 3. Try 2Factor configuration (ignore placeholder values)
  const twoFactorKey = (process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim() !== '' && process.env.TWOFACTOR_API_KEY.trim() !== 'your-2factor-api-key') ? process.env.TWOFACTOR_API_KEY.trim() : '';
  const twoFactorTemplate = process.env.TWOFACTOR_TEMPLATE_NAME || '';

  console.log('\n=================================================');
  console.log(`📱  PREPARING OUTBOUND SMS TO: +91 ${cleanPhone}`);
  console.log(`📝  SMS BODY: ${body}`);
  console.log('=================================================\n');

  // 2Factor.in integration
  if (twoFactorKey) {
    try {
      const otpMatch = body.match(/\b\d{6}\b/);
      const otpCode = otpMatch ? otpMatch[0] : '';
      
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.length === 10) {
          formattedPhone = `+91${formattedPhone}`;
        } else {
          formattedPhone = `+${formattedPhone}`;
        }
      }

      let url;
      if (otpCode) {
        url = `https://2factor.in/API/V1/${twoFactorKey}/SMS/${formattedPhone}/${otpCode}`;
        if (twoFactorTemplate) {
          url += `/${twoFactorTemplate}`;
        }
      } else {
        url = `https://2factor.in/API/V1/${twoFactorKey}/ADDON_SERVICES/SEND/TSMS`;
      }

      let res;
      if (otpCode) {
        res = await fetch(url, { method: 'GET' });
      } else {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            From: 'EMAHU',
            To: formattedPhone,
            Msg: body
          })
        });
      }

      const data = await res.json();
      if (data.Status === 'Success') {
        console.log(`✔️ SMS sent successfully via 2Factor. Session ID: ${data.Details}`);
        return { success: true, messageId: data.Details, service: '2factor' };
      } else {
        console.error('❌ 2Factor API error:', data.Details);
        return { success: false, error: data.Details };
      }
    } catch (err) {
      console.error('❌ 2Factor network error:', err.message);
      return { success: false, error: err.message };
    }
  }

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
