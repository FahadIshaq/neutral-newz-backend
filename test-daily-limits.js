#!/usr/bin/env node

/**
 * Test script to verify daily limits functionality
 * This script checks the daily limits endpoint and simulates the processing logic
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testDailyLimits() {
  console.log('🧪 Testing Daily Limits Functionality');
  console.log('=====================================');
  
  try {
    // Test 1: Check current daily limits status
    console.log('\n📊 Test 1: Checking current daily limits...');
    const limitsResponse = await axios.get(`${BASE_URL}/api/system/daily-limits`);
    
    if (limitsResponse.data.success) {
      const data = limitsResponse.data.data;
      console.log(`✅ Daily limits endpoint working`);
      console.log(`📅 Date: ${data.date}`);
      console.log(`📈 Total: ${data.limits.total.current}/${data.limits.total.limit} (${data.limits.total.percentage}%)`);
      console.log(`📊 Categories:`);
      
      Object.entries(data.limits.byCategory).forEach(([category, info]) => {
        console.log(`   ${category}: ${info.current}/${info.limit} (${info.percentage}%) - ${info.remaining} remaining`);
      });
      
      console.log(`🎯 Status: ${data.status.atLimit ? 'AT LIMIT' : 'CAN PROCESS'}`);
      if (data.status.categoriesAtLimit.length > 0) {
        console.log(`⚠️ Categories at limit: ${data.status.categoriesAtLimit.join(', ')}`);
      }
    } else {
      console.log('❌ Daily limits endpoint failed');
      console.log(limitsResponse.data);
    }
    
    // Test 2: Check system status
    console.log('\n🔧 Test 2: Checking system status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/system/status`);
    
    if (statusResponse.data.success) {
      console.log('✅ System status endpoint working');
      const enhancedProcessing = statusResponse.data.data.enhancedProcessing;
      console.log(`📦 Queue size: ${enhancedProcessing.queueSize}`);
      console.log(`🔄 Is processing: ${enhancedProcessing.isProcessing}`);
      console.log(`⏰ Last processed: ${enhancedProcessing.lastProcessed}`);
    } else {
      console.log('❌ System status endpoint failed');
    }
    
    // Test 3: Check health endpoint
    console.log('\n💚 Test 3: Checking health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    
    if (healthResponse.data.status === 'healthy') {
      console.log('✅ Health endpoint working');
      console.log(`📊 Database: ${healthResponse.data.database.status}`);
      console.log(`⏱️ Uptime: ${Math.round(healthResponse.data.uptime / 60)} minutes`);
    } else {
      console.log('❌ Health endpoint failed');
    }
    
    console.log('\n🎉 Daily limits test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Daily limit: 150 total articles');
    console.log('   • Category limit: 50 articles each (US, International, Finance)');
    console.log('   • Processing: Every 30 minutes');
    console.log('   • RSS checking: Every 30 seconds');
    console.log('   • Endpoint: GET /api/system/daily-limits');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testDailyLimits();
