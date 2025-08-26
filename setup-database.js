#!/usr/bin/env node

/**
 * Database Setup Script for Neutral News Backend
 * 
 * This script helps you set up the database tables and initial data.
 * Run this after creating the tables with the SQL from database-schema.sql
 */

const fetch = require('node-fetch');

// Configuration - update these with your actual values
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function setupDatabase() {
  console.log('🚀 Setting up Neutral News Database...\n');

  try {
    // Step 1: Check if backend is running
    console.log('1️⃣ Checking if backend is running...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Backend not responding: ${healthResponse.status}`);
    }
    console.log('✅ Backend is running\n');

    // Step 2: Create admin user
    console.log('2️⃣ Creating admin user...');
    const adminResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        email: 'admin@neutralnews.com'
      })
    });

    if (adminResponse.ok) {
      console.log('✅ Admin user created successfully');
    } else {
      const adminData = await adminResponse.json();
      if (adminData.error && adminData.error.includes('already exists')) {
        console.log('ℹ️ Admin user already exists');
      } else {
        console.log('⚠️ Admin user creation failed:', adminData.error);
      }
    }
    console.log('');

    // Step 3: Populate initial RSS feeds
    console.log('3️⃣ Populating initial RSS feeds...');
    const feedsResponse = await fetch(`${BACKEND_URL}/api/feeds/populate-initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (feedsResponse.ok) {
      const feedsData = await feedsResponse.json();
      console.log(`✅ RSS feeds populated: ${feedsData.count} feeds created`);
    } else {
      const feedsData = await feedsResponse.json();
      if (feedsData.error && feedsData.error.includes('already exists')) {
        console.log('ℹ️ RSS feeds already exist');
      } else {
        console.log('⚠️ RSS feeds population failed:', feedsData.error);
      }
    }
    console.log('');

    // Step 4: Test login
    console.log('4️⃣ Testing admin login...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Admin login successful');
      console.log(`🔑 Token received: ${loginData.token ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Admin login failed');
    }
    console.log('');

    console.log('🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start your frontend: cd admin && npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Login with:', ADMIN_USERNAME, '/', ADMIN_PASSWORD);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your backend is running: npm run dev');
    console.log('2. Check your environment variables');
    console.log('3. Verify your Supabase connection');
    console.log('4. Run the SQL from database-schema.sql in Supabase first');
  }
}

// Run the setup
setupDatabase();

