#!/usr/bin/env node

const BASE_URL = 'http://localhost:3001';

async function testPublicEndpoints() {
  console.log('🧪 Testing Public Endpoints...\n');

  const endpoints = [
    '/api/public/briefs',
    '/api/public/briefs/stats',
    '/api/public/briefs/latest/5',
    '/api/public/briefs/category/US_NATIONAL',
    '/api/system/daily-limits'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      const response = await fetch(`${BASE_URL}${endpoint}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success (${response.status}): ${data.success ? 'API Response OK' : 'API Error'}`);
        if (data.data) {
          if (Array.isArray(data.data)) {
            console.log(`   📊 Data: ${data.data.length} items`);
          } else if (data.data.briefs) {
            console.log(`   📊 Data: ${data.data.briefs.length} briefs, ${data.data.total} total`);
          } else {
            console.log(`   📊 Data: ${Object.keys(data.data).length} properties`);
          }
        }
      } else {
        console.log(`❌ Failed (${response.status}): ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('🎉 Public endpoint testing complete!');
}

// Run the test
testPublicEndpoints().catch(console.error);

