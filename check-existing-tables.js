#!/usr/bin/env node

/**
 * Check what tables exist in the database
 * This will help us understand the current database structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('🔍 Checking existing tables in database...\n');

  try {
    // Try to query common table names
    const tableNames = [
      'brief_edit_logs',
      'brief_review_logs', 
      'news_briefs',
      'news_articles',
      'rss_feeds',
      'processing_logs'
    ];

    for (const tableName of tableNames) {
      try {
        console.log(`📋 Checking table: ${tableName}`);
        
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`   ❌ Table '${tableName}' does not exist`);
          } else {
            console.log(`   ⚠️  Error querying '${tableName}': ${error.message}`);
          }
        } else {
          console.log(`   ✅ Table '${tableName}' exists and is accessible`);
          
          // Try to get more info about the table
          try {
            const { data: sampleData, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(3);
            
            if (sampleError) {
              console.log(`      ⚠️  Can't read data: ${sampleError.message}`);
            } else {
              console.log(`      📊 Has ${sampleData.length} records`);
              if (sampleData.length > 0) {
                console.log(`      📝 Sample record keys: ${Object.keys(sampleData[0]).join(', ')}`);
              }
            }
          } catch (e) {
            console.log(`      ⚠️  Error reading data: ${e.message}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking '${tableName}': ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }

    // Try to get a list of all tables (this might not work with PostgREST)
    console.log('🔍 Attempting to list all tables...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (tablesError) {
        console.log('❌ Cannot list tables via information_schema (PostgREST limitation)');
        console.log('💡 This is normal for Supabase - you need to check the dashboard manually');
      } else {
        console.log('📋 Available tables:');
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      }
    } catch (error) {
      console.log('❌ Cannot access information_schema (PostgREST limitation)');
    }

    console.log('\n📋 Summary:');
    console.log('   • Check your Supabase dashboard > Table Editor to see all tables');
    console.log('   • If brief_edit_logs doesn\'t exist, run the SQL script manually');
    console.log('   • The hint mentioned brief_review_logs - this might be an old table');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the check
checkTables();
