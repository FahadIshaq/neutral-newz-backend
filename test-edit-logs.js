#!/usr/bin/env node

/**
 * Test script to verify edit logs functionality
 * Run this after setting up the database table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testEditLogs() {
  console.log('🧪 Testing Edit Logs Functionality...\n');

  try {
    // Test 1: Try to query the brief_edit_logs table directly
    console.log('1️⃣ Checking if brief_edit_logs table exists...');
    
    try {
      const { data: logs, error: tableError } = await supabase
        .from('brief_edit_logs')
        .select('count')
        .limit(1);
      
      if (tableError) {
        if (tableError.code === 'PGRST116') {
          console.log('❌ brief_edit_logs table not found. Run the migration first.');
          console.log('💡 Run: cd backend && ./setup-edit-logs.sh');
          return;
        } else {
          console.error('❌ Error checking table:', tableError);
          return;
        }
      }
      
      console.log('✅ Table exists!\n');
    } catch (error) {
      console.log('❌ brief_edit_logs table not found. Run the migration first.');
      console.log('💡 Run: cd backend && ./setup-edit-logs.sh');
      return;
    }

    // Test 2: Check if there are any existing logs
    console.log('2️⃣ Checking existing edit logs...');
    const { data: logs, error: logsError } = await supabase
      .from('brief_edit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (logsError) {
      console.error('❌ Error fetching logs:', logsError);
      return;
    }
    
    console.log(`📊 Found ${logs.length} existing log entries`);
    
    if (logs.length > 0) {
      console.log('📝 Sample log entry:');
      console.log(JSON.stringify(logs[0], null, 2));
    }
    
    console.log('\n3️⃣ Testing log insertion...');
    
    // Test 3: Insert a test log entry
    const testLog = {
      brief_id: 'test-brief-id-123', // Dummy text ID (matching news_briefs.id type)
      action: 'test',
      editor_id: 'test-script',
      previous_content: { title: 'Test Title', summary: 'Test Summary' },
      new_content: { title: 'Updated Title', summary: 'Updated Summary' },
      edit_notes: 'This is a test log entry',
      metadata: { source: 'test-script', timestamp: new Date().toISOString() }
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('brief_edit_logs')
      .insert(testLog)
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting test log:', insertError);
      return;
    }
    
    console.log('✅ Test log inserted successfully!');
    console.log('📝 Inserted log:', JSON.stringify(insertResult[0], null, 2));
    
    // Test 4: Clean up test data
    console.log('\n4️⃣ Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('brief_edit_logs')
      .delete()
      .eq('editor_id', 'test-script');
    
    if (deleteError) {
      console.error('❌ Error cleaning up test data:', deleteError);
      return;
    }
    
    console.log('✅ Test data cleaned up!');
    
    console.log('\n🎉 All tests passed! Edit logs functionality is working correctly.');
    console.log('\n📋 Next steps:');
    console.log('   1. Go to Brief Management page and edit a brief');
    console.log('   2. Check the Audit Logs page to see the activity');
    console.log('   3. All future edits will be automatically logged');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEditLogs();
