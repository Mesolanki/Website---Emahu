const crypto = require('crypto');

function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let clean = base32.replace(/=+$/, '').toUpperCase();
  let length = clean.length;
  let bits = 0;
  let value = 0;
  let index = 0;
  let buffer = Buffer.alloc(Math.floor((length * 5) / 8));
  
  for (let i = 0; i < length; i++) {
    let val = alphabet.indexOf(clean[i]);
    if (val === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return buffer;
}

function verifyTOTP(secret, code) {
  if (!secret || !code) return false;
  const steps = [-1, 0, 1]; // +/- 30s window
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  
  for (const step of steps) {
    const checkCounter = counter + step;
    try {
      const key = base32Decode(secret);
      const counterBuffer = Buffer.alloc(8);
      let temp = checkCounter;
      for (let i = 7; i >= 0; i--) {
        counterBuffer[i] = temp & 0xff;
        temp = temp >> 8;
      }
      
      const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const binary = ((hmac[offset] & 0x7f) << 24) |
                     ((hmac[offset + 1] & 0xff) << 16) |
                     ((hmac[offset + 2] & 0xff) << 8) |
                     (hmac[offset + 3] & 0xff);
      
      const checkCode = (binary % 1000000).toString().padStart(6, '0');
      if (checkCode === code.trim()) {
        return true;
      }
    } catch (e) {
      console.error('TOTP error:', e.message);
      return false;
    }
  }
  return false;
}

module.exports = {
  verifyTOTP
};
