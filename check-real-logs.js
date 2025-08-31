#!/usr/bin/env node

/**
 * Check if real edit logs are being created
 * This will help verify that the logging system is working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkRealLogs() {
  console.log('🔍 Checking Real Edit Logs...\n');

  try {
    // Get all edit logs
    const { data: logs, error } = await supabase
      .from('brief_edit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching logs:', error);
      return;
    }
    
    console.log(`📊 Found ${logs.length} total log entries\n`);
    
    if (logs.length === 0) {
      console.log('❌ No logs found. The table might be empty or not working.');
      return;
    }
    
    // Categorize logs
    const testLogs = logs.filter(log => log.editor_id === 'test-script' || log.editor_id === 'setup-script');
    const realLogs = logs.filter(log => !['test-script', 'setup-script'].includes(log.editor_id));
    
    console.log('📋 Log Analysis:');
    console.log(`   Test/Setup Logs: ${testLogs.length}`);
    console.log(`   Real User Logs: ${realLogs.length}`);
    console.log(`   Total Logs: ${logs.length}\n`);
    
    if (realLogs.length === 0) {
      console.log('⚠️  No real user activity logs found yet.');
      console.log('💡 To generate real logs, you need to:');
      console.log('   1. Go to Brief Management page');
      console.log('   2. Edit a brief (change title, summary, tags)');
      console.log('   3. Use AI Revision on a brief');
      console.log('   4. Archive or delete a brief');
      console.log('   5. Check this script again\n');
    } else {
      console.log('✅ Real user activity logs found!');
      console.log('📝 Recent real logs:');
      realLogs.slice(0, 3).forEach((log, index) => {
        console.log(`\n   Log ${index + 1}:`);
        console.log(`   - Action: ${log.action}`);
        console.log(`   - Brief ID: ${log.brief_id}`);
        console.log(`   - Editor: ${log.editor_id}`);
        console.log(`   - Notes: ${log.edit_notes || 'None'}`);
        console.log(`   - Time: ${log.timestamp}`);
      });
    }
    
    // Show all logs for debugging
    console.log('\n📋 All Logs (for debugging):');
    logs.forEach((log, index) => {
      console.log(`\n   ${index + 1}. ${log.action} by ${log.editor_id} at ${log.timestamp}`);
      console.log(`      Brief: ${log.brief_id}`);
      console.log(`      Notes: ${log.edit_notes || 'None'}`);
      if (log.previous_content && log.new_content) {
        console.log(`      Changed: ${log.previous_content.title || 'N/A'} → ${log.new_content.title || 'N/A'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the check
checkRealLogs();
