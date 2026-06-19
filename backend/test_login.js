const http = require('http');

function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  const email = `test_admin_${Date.now()}@emahu.com`;
  const password = 'password123';
  
  console.log('Registering admin...');
  try {
    const regRes = await postJSON('http://localhost:5000/api/auth/register', {
      name: 'Test Admin',
      email,
      password,
      role: 'admin',
      phone: '9876543211'
    });
    console.log('Register response:', regRes);

    console.log('\nLogging in...');
    const loginRes = await postJSON('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    console.log('Login response:', loginRes);
  } catch (err) {
    console.error('Error during HTTP request:', err);
  }
}

run();
