#!/usr/bin/env node

/**
 * Complete Database Cleanup Script for Neutral News Backend
 * 
 * This script will clean ALL data from your database:
 * - RSS feeds
 * - News articles  
 * - News briefs
 * - Processing logs
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA and start fresh!
 */

const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let authToken = null;

async function login() {
  console.log('🔐 Logging in to get authentication token...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success && data.token) {
      authToken = data.token;
      console.log('✅ Login successful');
      return true;
    } else if (data.data && data.data.token) {
      authToken = data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      throw new Error('No token received from login');
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function getCurrentData() {
  console.log('\n📊 Getting current database statistics...');
  
  try {
    const [feedsResponse, articlesResponse, briefsResponse, logsResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/api/feeds`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      fetch(`${BACKEND_URL}/api/articles`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => ({ ok: false, status: 404 })), // Articles endpoint might not exist
      fetch(`${BACKEND_URL}/api/briefs`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      fetch(`${BACKEND_URL}/api/logs`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => ({ ok: false, status: 404 })) // Logs endpoint might not exist
    ]);

    let stats = {
      feeds: 0,
      articles: 0,
      briefs: 0,
      logs: 0
    };

    if (feedsResponse.ok) {
      const feedsData = await feedsResponse.json();
      stats.feeds = feedsData.data ? feedsData.data.length : 0;
    }

    if (articlesResponse.ok) {
      const articlesData = await articlesResponse.json();
      stats.articles = articlesData.data ? articlesData.data.length : 0;
    }

    if (briefsResponse.ok) {
      const briefsData = await briefsResponse.json();
      stats.briefs = briefsData.data ? briefsData.data.length : 0;
    }

    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      stats.logs = logsData.data ? logsData.data.length : 0;
    }

    console.log('📈 Current database statistics:');
    console.log(`   • RSS Feeds: ${stats.feeds}`);
    console.log(`   • News Articles: ${stats.articles}`);
    console.log(`   • News Briefs: ${stats.briefs}`);
    console.log(`   • Processing Logs: ${stats.logs}`);
    console.log(`   • Total Records: ${stats.feeds + stats.articles + stats.briefs + stats.logs}`);

    return stats;
  } catch (error) {
    console.error('❌ Failed to get current data:', error.message);
    return null;
  }
}

async function cleanDatabase() {
  console.log('\n🧹 Starting database cleanup...');
  
  try {
    // Step 1: Clear RSS feeds (this will cascade to articles and briefs)
    console.log('1️⃣ Clearing RSS feeds...');
    const feedsResponse = await fetch(`${BACKEND_URL}/api/feeds/clear-all`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (feedsResponse.ok) {
      console.log('✅ RSS feeds cleared');
    } else if (feedsResponse.status === 404) {
      console.log('⚠️  Clear feeds endpoint not found, trying alternative method...');
      
      // Try to get all feeds and delete them individually
      const getFeedsResponse = await fetch(`${BACKEND_URL}/api/feeds`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (getFeedsResponse.ok) {
        const feedsData = await getFeedsResponse.json();
        const feeds = feedsData.data || [];
        
        if (feeds.length > 0) {
          console.log(`   Deleting ${feeds.length} feeds individually...`);
          for (const feed of feeds) {
            try {
              await fetch(`${BACKEND_URL}/api/feeds/${feed.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
              });
            } catch (error) {
              console.log(`   ⚠️  Could not delete feed ${feed.id}: ${error.message}`);
            }
          }
        }
      }
    } else {
      console.log(`⚠️  Clear feeds failed: ${feedsResponse.status}`);
    }

    // Step 2: Try to clear articles directly
    console.log('2️⃣ Clearing news articles...');
    try {
      const articlesResponse = await fetch(`${BACKEND_URL}/api/articles/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (articlesResponse.ok) {
        console.log('✅ News articles cleared');
      } else {
        console.log(`⚠️  Clear articles endpoint not found (${articlesResponse.status})`);
      }
    } catch (error) {
      console.log('⚠️  Articles endpoint not available');
    }

    // Step 3: Try to clear briefs directly
    console.log('3️⃣ Clearing news briefs...');
    try {
      const briefsResponse = await fetch(`${BACKEND_URL}/api/briefs/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (briefsResponse.ok) {
        console.log('✅ News briefs cleared');
      } else {
        console.log(`⚠️  Clear briefs endpoint not found (${briefsResponse.status})`);
      }
    } catch (error) {
      console.log('⚠️  Briefs endpoint not available');
    }

    // Step 4: Try to clear processing logs
    console.log('4️⃣ Clearing processing logs...');
    try {
      const logsResponse = await fetch(`${BACKEND_URL}/api/logs/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (logsResponse.ok) {
        console.log('✅ Processing logs cleared');
      } else {
        console.log(`⚠️  Clear logs endpoint not found (${logsResponse.status})`);
      }
    } catch (error) {
      console.log('⚠️  Logs endpoint not available');
    }

    console.log('\n✅ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  }
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying database cleanup...');
  
  try {
    const stats = await getCurrentData();
    
    if (stats) {
      const totalRecords = stats.feeds + stats.articles + stats.briefs + stats.logs;
      
      if (totalRecords === 0) {
        console.log('🎉 SUCCESS: Database is completely clean!');
        console.log('   All tables are empty and ready for fresh data.');
      } else {
        console.log('⚠️  WARNING: Some data still remains:');
        console.log(`   • RSS Feeds: ${stats.feeds}`);
        console.log(`   • News Articles: ${stats.articles}`);
        console.log(`   • News Briefs: ${stats.briefs}`);
        console.log(`   • Processing Logs: ${stats.logs}`);
        console.log(`   • Total Remaining: ${totalRecords}`);
        
        if (totalRecords > 0) {
          console.log('\n💡 You may need to run the SQL cleanup script directly in Supabase:');
          console.log('   1. Go to your Supabase project dashboard');
          console.log('   2. Navigate to SQL Editor');
          console.log('   3. Run the complete-database-cleanup.sql script');
        }
      }
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function main() {
  console.log('🧹 Complete Database Cleanup for Neutral News Backend');
  console.log('==================================================');
  console.log('⚠️  WARNING: This will DELETE ALL DATA from your database!');
  console.log('');

  // Check if backend is running
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Backend not responding: ${healthResponse.status}`);
    }
    console.log('✅ Backend is running');
  } catch (error) {
    console.error('❌ Backend is not running. Please start it first:');
    console.error('   cd backend && npm run dev');
    process.exit(1);
  }

  // Login
  if (!(await login())) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  // Show current data
  await getCurrentData();

  // Confirm cleanup
  console.log('\n⚠️  Are you sure you want to DELETE ALL DATA?');
  console.log('   This action cannot be undone!');
  console.log('');
  console.log('   To proceed, run this script with the --force flag:');
  console.log('   node clean-database.js --force');
  console.log('');

  if (process.argv.includes('--force')) {
    console.log('🚨 FORCE FLAG DETECTED - PROCEEDING WITH CLEANUP');
    await cleanDatabase();
    await verifyCleanup();
  } else {
    console.log('🛑 Cleanup cancelled. Use --force to proceed.');
    console.log('');
    console.log('💡 Alternative: Run the SQL script directly in Supabase:');
    console.log('   backend/complete-database-cleanup.sql');
  }
}

// Run the script
main().catch(console.error);
