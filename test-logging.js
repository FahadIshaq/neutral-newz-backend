#!/usr/bin/env node

/**
 * Test if the backend logging functionality is working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testLogging() {
  console.log('🧪 Testing Backend Logging Functionality...\n');

  try {
    // Test 1: Check if we can insert a log
    console.log('1️⃣ Testing log insertion...');
    
    // First, get a real brief ID to reference
    console.log('   Getting a real brief ID...');
    const { data: briefs, error: briefsError } = await supabase
      .from('news_briefs')
      .select('id')
      .limit(1);
    
    if (briefsError || !briefs || briefs.length === 0) {
      console.error('❌ No briefs found to reference');
      return;
    }
    
    const realBriefId = briefs[0].id;
    console.log('   Using brief ID:', realBriefId);
    
    const testLog = {
      brief_id: realBriefId, // Use real brief ID from news_briefs table
      action: 'edit', // Use valid action from check constraint
      editor_id: 'test-script',
      previous_content: { title: 'Test Before', summary: 'Test summary before' },
      new_content: { title: 'Test After', summary: 'Test summary after' },
      edit_notes: 'Testing if logging system works',
      metadata: { test: true, timestamp: new Date().toISOString() }
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
    console.log('📝 Log ID:', insertResult[0].id);
    
    // Test 2: Check if we can read the log back
    console.log('\n2️⃣ Testing log retrieval...');
    
    const { data: retrievedLog, error: retrieveError } = await supabase
      .from('brief_edit_logs')
      .select('*')
      .eq('id', insertResult[0].id)
      .single();
    
    if (retrieveError) {
      console.error('❌ Error retrieving test log:', retrieveError);
      return;
    }
    
    console.log('✅ Test log retrieved successfully!');
    console.log('📝 Retrieved log:', {
      id: retrievedLog.id,
      action: retrievedLog.action,
      editor_id: retrievedLog.editor_id,
      timestamp: retrievedLog.timestamp
    });
    
    // Test 3: Clean up test data
    console.log('\n3️⃣ Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('brief_edit_logs')
      .delete()
      .eq('id', insertResult[0].id);
    
    if (deleteError) {
      console.error('❌ Error cleaning up test data:', deleteError);
      return;
    }
    
    console.log('✅ Test data cleaned up!');
    
    console.log('\n🎉 All logging tests passed!');
    console.log('💡 The backend logging system is working correctly.');
    console.log('\n📋 Next steps:');
    console.log('   1. Edit a brief in the frontend');
    console.log('   2. Check backend terminal for logging messages');
    console.log('   3. Check audit logs page for new entries');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLogging();
