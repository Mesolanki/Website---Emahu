const { Resend } = require('resend');

/**
 * Send email using Resend (https://resend.com).
 *
 * WHY RESEND instead of nodemailer:
 *   - Vercel and most serverless platforms block outbound SMTP (port 25/465/587).
 *   - Resend uses HTTPS (port 443) — always open.
 *   - Zero cold-start penalty, instant delivery, reliable on all environments.
 *   - No IPv6 / ENETUNREACH issues, no connection timeouts.
 *
 * Setup:
 *   1. Create a free account at https://resend.com
 *   2. Add RESEND_API_KEY to your .env
 *   3. (Production) Verify your domain in Resend dashboard → use verified FROM address
 *
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<Object>} { success, messageId, simulated, error }
 */
const sendEmail = async (options) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM || 'Emahu Marketplace <onboarding@resend.dev>';

  console.log('\n=================================================');
  console.log(`✉️  SENDING EMAIL TO: ${options.to}`);
  console.log(`📌  SUBJECT: ${options.subject}`);
  console.log(`📝  BODY PREVIEW: ${(options.text || '').substring(0, 80)}...`);
  console.log('=================================================\n');

  // Pre-validate options.to before hitting the Resend SDK
  if (!options.to || typeof options.to !== 'string' || !options.to.trim()) {
    console.error('❌ Email failed: Recipient email address ("to") is missing or empty.');
    return { success: false, error: 'Recipient email address ("to") is required.' };
  }

  const cleanTo = options.to.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanTo)) {
    console.error(`❌ Email failed: Invalid recipient email address format: "${options.to}"`);
    return { success: false, error: 'Recipient email address format is invalid. Example format: email@example.com' };
  }

  const toEmail = cleanTo.toLowerCase();
  const isTestDomain = toEmail.endsWith('@emahu.com') || toEmail.endsWith('@example.com') || toEmail.endsWith('@test.com');
  const simulateFlag = process.env.SIMULATE_EMAIL === 'true';

  // If no API key is configured OR test domain OR SIMULATE_EMAIL is enabled → simulate send
  if (!apiKey || isTestDomain || simulateFlag) {
    console.log(`ℹ️  Simulating email send (dev/test mode) to: ${options.to}`);
    return { success: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [cleanTo],
      subject: options.subject,
      text: options.text,
      html: options.html || undefined
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      const isSandbox = (error.message || '').includes('You can only send testing emails to your own email address') 
        || error.statusCode === 403 
        || (error.message || '').includes('Unable to fetch data')
        || (error.message || '').includes('could not be resolved')
        || (error.message || '').toLowerCase().includes('fetch failed');
      return { 
        success: false, 
        error: error.message || JSON.stringify(error),
        sandboxRestricted: isSandbox
      };
    }

    console.log(`✔️  Email sent successfully via Resend. ID: ${data?.id}`);
    return { success: true, messageId: data?.id };

  } catch (err) {
    console.error('❌ Resend SDK Exception:', err.message);
    const isSandbox = (err.message || '').includes('You can only send testing emails to your own email address')
      || (err.message || '').includes('Unable to fetch data')
      || (err.message || '').includes('could not be resolved')
      || (err.message || '').toLowerCase().includes('fetch failed');
    return { 
      success: false, 
      error: err.message,
      sandboxRestricted: isSandbox
    };
  }
};

module.exports = sendEmail;
