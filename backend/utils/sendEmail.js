const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer
 * Falls back to console logging if SMTP settings are not configured.
 * 
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<Object>} { success, messageId, simulated, error }
 */
let cachedTransporter = null;

const sendEmail = async (options, retryCount = 1) => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER || 'mksolanki527@gmail.com';
  const pass = process.env.EMAIL_PASS || 'pdvi vcic ugsy nwmq';
  const from = process.env.EMAIL_FROM || `"Emahu Marketplace" <${user}>`;

  console.log('\n=================================================');
  console.log(`✉️  PREPARING OUTBOUND EMAIL TO: ${options.to} (Attempts remaining: ${retryCount})`);
  console.log(`📌  SUBJECT: ${options.subject}`);
  console.log(`📝  BODY SUMMARY:\n${options.text}`);
  console.log('=================================================\n');

  if (!host || !user || !pass) {
    console.log('ℹ️  SMTP credentials not fully configured in backend/.env. Simulated email logged above.');
    return { success: true, simulated: true };
  }

  // Detect serverless environment (Vercel/AWS Lambda) where connection pooling is unreliable due to container freezing
  const isServerless = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const usePool = !isServerless;

  try {
    let transporter;

    if (usePool) {
      if (!cachedTransporter) {
        console.log('✨ Initializing pooled SMTP transporter...');
        cachedTransporter = nodemailer.createTransport({
          pool: true, // Use pooling to keep connection warm
          host,
          port,
          secure: port === 465, // true for 465, false for other ports
          auth: {
            user,
            pass,
          },
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 5,
          connectionTimeout: 5000, // 5 seconds connection timeout
          socketTimeout: 10000,     // 10 seconds socket inactivity timeout
          greetingTimeout: 5000     // 5 seconds greeting timeout
        });
      }
      transporter = cachedTransporter;
    } else {
      console.log('⚡ Serverless detected. Creating non-pooled SMTP transporter...');
      transporter = nodemailer.createTransport({
        pool: false,
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 5000,
        socketTimeout: 10000,
        greetingTimeout: 5000
      });
    }

    const mailOptions = {
      from,
      to: options.to,
      replyTo: user,
      subject: options.subject,
      text: options.text,
      html: options.html || undefined,
      headers: {
        'X-Priority': '1', // High priority
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'OOF, AutoReply'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✔️  Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email via SMTP:', error.message);
    
    // Invalidate cached transporter on error to force a re-connect next time
    cachedTransporter = null;

    // Retry once if we have retries left
    if (retryCount > 0) {
      console.log('🔄 Retrying email dispatch with a fresh connection...');
      return sendEmail(options, retryCount - 1);
    }

    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
