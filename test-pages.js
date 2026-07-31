// Test basic website pages
const http = require('http');

const pages = [
  '/',
  '/products',
  '/about',
  '/contact',
  '/auth/login',
  '/auth/register',
  '/seller',
  '/admin',
  '/account'
];

async function testPage(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ path, status: res.statusCode, success: res.statusCode < 400 });
      });
    });

    req.on('error', (error) => {
      resolve({ path, status: 'ERROR', success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ path, status: 'TIMEOUT', success: false });
    });

    req.end();
  });
}

async function testAllPages() {
  console.log('🧪 Testing website pages...\n');
  
  const results = [];
  for (const page of pages) {
    const result = await testPage(page);
    results.push(result);
    console.log(`${result.success ? '✅' : '❌'} ${result.path} - ${result.status}`);
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 Results: ${successCount}/${results.length} pages accessible`);
  
  return results;
}

testAllPages().then(() => process.exit(0)).catch(() => process.exit(1));