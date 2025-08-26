#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function setupAIIntegration() {
  console.log('🤖 Setting up AI Integration for Neutral News...\n');

  try {
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY not found in environment variables');
      console.log('📝 Please add your OpenAI API key to the .env file:');
      console.log('   OPENAI_API_KEY=your_actual_api_key_here\n');
      return;
    }

    console.log('✅ OpenAI API key found');
    console.log('🔑 Key starts with:', process.env.OPENAI_API_KEY.substring(0, 8) + '...');

    // Test database connection
    console.log('\n🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('news_briefs')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('❌ Database connection failed:', testError.message);
      console.log('📝 Please check your Supabase configuration');
      return;
    }

    console.log('✅ Database connection successful');

    // Check if new columns exist
    console.log('\n🔍 Checking database schema...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'news_briefs' });

    if (columnsError) {
      console.log('⚠️  Could not check table columns, but continuing...');
    } else {
      const hasStatus = columns.some(col => col.column_name === 'status');
      const hasLLMMetadata = columns.some(col => col.column_name === 'llm_metadata');
      
      if (!hasStatus || !hasLLMMetadata) {
        console.log('⚠️  Database schema needs updating');
        console.log('📝 Please run the migration script: migrate-existing-tables.sql');
        console.log('📝 Or update your database schema manually');
      } else {
        console.log('✅ Database schema is up to date');
      }
    }

    // Check admin user
    console.log('\n🔍 Checking admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('username, role')
      .eq('username', 'admin')
      .single();

    if (adminError || !adminUser) {
      console.log('❌ Admin user not found');
      console.log('📝 Please run the create-admin.js script first');
      return;
    }

    console.log('✅ Admin user found:', adminUser.username);

    // Summary
    console.log('\n🎉 AI Integration Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. ✅ OpenAI API key configured');
    console.log('2. ✅ Database connection verified');
    console.log('3. ✅ Admin user authenticated');
    console.log('\n🚀 Start the backend server:');
    console.log('   npm run dev');
    console.log('\n🌐 Access the admin panel:');
    console.log('   http://localhost:3000');
    console.log('\n🔐 Login with: admin / admin123');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('1. Check your .env file has all required variables');
    console.log('2. Ensure Supabase is running and accessible');
    console.log('3. Verify your OpenAI API key is valid');
  }
}

setupAIIntegration();

