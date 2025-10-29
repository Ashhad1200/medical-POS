/**
 * Test script to verify login response format
 * Run: node server/test-login-response.js
 */

const http = require('http');

const testEmail = process.env.TEST_EMAIL || 'admin@example.com';
const testPassword = process.env.TEST_PASSWORD || 'admin123';

const postData = JSON.stringify({
  email: testEmail,
  password: testPassword,
});

const options = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ Login Response Test\n');
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('\nResponse Body:');
    console.log(JSON.stringify(JSON.parse(data), null, 2));

    const response = JSON.parse(data);
    
    // Validate structure
    console.log('\n📋 Response Structure Validation:');
    console.log('✓ success:', typeof response.success === 'boolean');
    console.log('✓ data:', typeof response.data === 'object');
    console.log('✓ data.user:', typeof response.data?.user === 'object');
    console.log('✓ data.token:', typeof response.data?.token === 'string');
    console.log('✓ data.user.role_in_pos:', response.data?.user?.role_in_pos);
    console.log('✓ data.user.id:', response.data?.user?.id);
    console.log('✓ data.user.email:', response.data?.user?.email);
    
    if (response.success && response.data?.user && response.data?.token) {
      console.log('\n✅ Response structure is correct!');
      process.exit(0);
    } else {
      console.log('\n❌ Response structure is incorrect!');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
  console.error('\nMake sure the backend is running: cd pos && npm start');
  process.exit(1);
});

console.log('🔍 Testing login response format...');
console.log(`Email: ${testEmail}`);
console.log(`POST http://localhost:4001/api/auth/login`);
console.log('');

req.write(postData);
req.end();
