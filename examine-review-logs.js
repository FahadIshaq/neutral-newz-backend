#!/usr/bin/env node

/**
 * Examine the existing brief_review_logs table structure
 * This will help us decide if we can use it or need to create brief_edit_logs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function examineReviewLogs() {
  console.log('🔍 Examining existing brief_review_logs table...\n');

  try {
    // Get sample data from the existing table
    const { data: logs, error } = await supabase
      .from('brief_review_logs')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching review logs:', error);
      return;
    }
    
    console.log(`📊 Found ${logs.length} review log entries\n`);
    
    if (logs.length > 0) {
      console.log('📋 Table Structure:');
      const sampleLog = logs[0];
      Object.keys(sampleLog).forEach(key => {
        const value = sampleLog[key];
        const type = typeof value;
        const displayValue = value === null ? 'NULL' : 
                           type === 'object' ? JSON.stringify(value).substring(0, 50) + '...' :
                           String(value).substring(0, 50);
        console.log(`   ${key}: ${type} = ${displayValue}`);
      });
      
      console.log('\n📝 Sample Data:');
      logs.forEach((log, index) => {
        console.log(`\n   Entry ${index + 1}:`);
        console.log(`   - ID: ${log.id}`);
        console.log(`   - Brief ID: ${log.brief_id}`);
        console.log(`   - Reviewer: ${log.reviewer_id}`);
        console.log(`   - Action: ${log.action}`);
        console.log(`   - Previous Status: ${log.previous_status}`);
        console.log(`   - New Status: ${log.new_status}`);
        console.log(`   - Notes: ${log.review_notes || 'None'}`);
        console.log(`   - Changes: ${log.changes_made || 'None'}`);
        console.log(`   - Timestamp: ${log.timestamp}`);
      });
    }
    
    // Check if this table can be used for edit logs
    console.log('\n🔍 Compatibility Analysis:');
    
    const hasRequiredFields = {
      'brief_id': logs.some(log => log.brief_id),
      'action': logs.some(log => log.action),
      'timestamp': logs.some(log => log.timestamp),
      'notes': logs.some(log => log.review_notes || log.changes_made)
    };
    
    Object.entries(hasRequiredFields).forEach(([field, hasField]) => {
      console.log(`   ${field}: ${hasField ? '✅' : '❌'}`);
    });
    
    // Check if we need to create brief_edit_logs
    const missingFields = ['previous_content', 'new_content', 'editor_id', 'metadata'];
    const hasMissingFields = missingFields.some(field => 
      !Object.keys(logs[0] || {}).includes(field)
    );
    
    if (hasMissingFields) {
      console.log('\n❌ This table is missing required fields for edit logs:');
      missingFields.forEach(field => {
        if (!Object.keys(logs[0] || {}).includes(field)) {
          console.log(`   - ${field}`);
        }
      });
      
      console.log('\n💡 Recommendation: Create the new brief_edit_logs table');
      console.log('   Run the SQL script in your Supabase dashboard');
    } else {
      console.log('\n✅ This table has all required fields!');
      console.log('   We can potentially use it for edit logs');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the examination
examineReviewLogs();
