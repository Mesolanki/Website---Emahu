const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer
 * Falls back to console logging if SMTP settings are not configured.
 * 
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<Object>} { success, messageId, simulated, error }
 */
const sendEmail = async (options) => {
  const host = process.env.EMAIL_HOST || '';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  const from = process.env.EMAIL_FROM || '"Emahu Marketplace" <noreply@emahu.com>';

  console.log('\n=================================================');
  console.log(`✉️  PREPARING OUTBOUND EMAIL TO: ${options.to}`);
  console.log(`📌  SUBJECT: ${options.subject}`);
  console.log(`📝  BODY SUMMARY:\n${options.text}`);
  console.log('=================================================\n');

  if (!host || !user || !pass) {
    console.log('ℹ️  SMTP credentials not fully configured in backend/.env. Simulated email logged above.');
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✔️  Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email via SMTP:', error.message);
    // Return success: false but do not crash the calling function
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
