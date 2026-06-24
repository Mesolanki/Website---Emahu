const nodemailer = require('nodemailer');
const dns = require('dns').promises;

/**
 * Send email using Nodemailer.
 *
 * ROOT CAUSE FIX for ENETUNREACH on Vercel:
 *   Nodemailer does NOT honour the `family: 4` socket option — Node.js still
 *   resolves SMTP hostnames via its default resolver, which may return an IPv6
 *   address (e.g. 2607:f8b0:…). Vercel's serverless network stack cannot reach
 *   outbound IPv6, so the connection fails with ENETUNREACH.
 *
 *   The only reliable fix is to resolve the hostname to a concrete IPv4 address
 *   with `dns.resolve4()` BEFORE creating the transporter and pass that IP as
 *   the `host`. We keep `servername` set to the original hostname so TLS/SNI
 *   validation still works correctly.
 *
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<Object>} { success, messageId, simulated, error }
 */

/**
 * Resolve a hostname to its first IPv4 address.
 * Falls back to the original hostname if DNS lookup fails (e.g. in local dev).
 * Uses a short 3-second timeout so it never blocks the request.
 */
const resolveIPv4 = async (hostname) => {
  try {
    const addresses = await Promise.race([
      dns.resolve4(hostname),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 3000)
      )
    ]);
    if (addresses && addresses.length > 0) {
      console.log(`🌐 Resolved ${hostname} → ${addresses[0]} (IPv4)`);
      return addresses[0];
    }
  } catch (err) {
    console.warn(`⚠️  dns.resolve4 failed for ${hostname}: ${err.message}. Using hostname as-is.`);
  }
  return hostname;
};

const buildTransporter = (host, port, user, pass, servername) => {
  return nodemailer.createTransport({
    host,                          // Already an IPv4 address string after resolveIPv4()
    port,
    secure: port === 465,          // true → SSL on 465 | false → STARTTLS on 587
    auth: { user, pass },
    connectionTimeout: 5000,       // 5 s TCP connect timeout  (was 10s)
    greetingTimeout: 5000,         // 5 s SMTP greeting timeout (was 10s)
    socketTimeout: 8000,           // 8 s socket inactivity limit (was 20s)
    tls: {
      rejectUnauthorized: true,
      servername: servername || host // Original hostname for SNI / cert validation
    }
  });
};

const sendEmail = async (options, retryCount = 0) => {
  const smtpHostname = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port         = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user         = process.env.EMAIL_USER;
  const pass         = process.env.EMAIL_PASS;
  const from         = process.env.EMAIL_FROM || `"Emahu Marketplace" <${user}>`;

  console.log('\n=================================================');
  console.log(`✉️  PREPARING OUTBOUND EMAIL TO: ${options.to} (attempt ${1 + (1 - retryCount)} of 1)`);
  console.log(`📌  SUBJECT: ${options.subject}`);
  console.log(`📝  BODY PREVIEW: ${(options.text || '').substring(0, 80)}...`);
  console.log('=================================================\n');

  if (!user || !pass) {
    console.log('ℹ️  SMTP credentials not configured (EMAIL_USER / EMAIL_PASS missing). Simulating send.');
    return { success: true, simulated: true };
  }

  try {
    // ✅ KEY FIX: resolve hostname → IPv4 *before* handing it to Nodemailer.
    // This bypasses Node's default resolver which may return an IPv6 address.
    const ipv4Host = await resolveIPv4(smtpHostname);

    const transporter = buildTransporter(ipv4Host, port, user, pass, smtpHostname);

    const mailOptions = {
      from,
      to: options.to,
      replyTo: user,
      subject: options.subject,
      text: options.text,
      html: options.html || undefined,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'OOF, AutoReply'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✔️  Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ SMTP Error: ${error.message}`);

    if (retryCount > 0) {
      console.log(`🔄 Retrying email dispatch (${retryCount} attempt(s) remaining)...`);
      return sendEmail(options, retryCount - 1);
    }

    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
