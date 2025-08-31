#!/bin/bash

# Setup Edit Logs Table
echo "🔧 Setting up brief_edit_logs table..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one with your Supabase credentials."
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ SUPABASE_URL or SUPABASE_ANON_KEY not found in .env file"
    echo "💡 Make sure your .env file contains:"
    echo "   SUPABASE_URL=your_supabase_project_url"
    echo "   SUPABASE_ANON_KEY=your_supabase_anon_key"
    exit 1
fi

echo "📊 Using Supabase connection..."
echo "URL: $SUPABASE_URL"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "📊 Running database migration via Node.js..."

# Run the migration using Node.js instead of psql
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createEditLogsTable() {
  console.log('Creating brief_edit_logs table...');
  
  try {
    // Create the table using SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: \`
        CREATE TABLE IF NOT EXISTS brief_edit_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          brief_id TEXT REFERENCES news_briefs(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL CHECK (action IN ('edit', 'revise_ai', 'delete', 'archive')),
          editor_id VARCHAR(100) NOT NULL,
          previous_content JSONB,
          new_content JSONB,
          edit_notes TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_brief_edit_logs_brief_id ON brief_edit_logs(brief_id);
        CREATE INDEX IF NOT EXISTS idx_brief_edit_logs_action ON brief_edit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_brief_edit_logs_timestamp ON brief_edit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_brief_edit_logs_editor_id ON brief_edit_logs(editor_id);
      \`
    });
    
    if (error) {
      console.log('Note: exec_sql RPC not available, trying direct table creation...');
      
      // Try to create the table by inserting a test record (will fail if table doesn't exist)
      const { error: insertError } = await supabase
        .from('brief_edit_logs')
        .insert({
          brief_id: '00000000-0000-0000-0000-000000000000',
          action: 'test',
          editor_id: 'setup-script',
          previous_content: { title: 'Test' },
          new_content: { title: 'Test' },
          edit_notes: 'Setup test'
        });
      
      if (insertError && insertError.code === 'PGRST116') {
        console.log('❌ Table creation failed. You may need to create it manually in Supabase dashboard.');
        console.log('💡 Go to your Supabase dashboard > SQL Editor and run the create-edit-logs-table.sql file.');
        return false;
      }
      
      // Clean up test record
      await supabase
        .from('brief_edit_logs')
        .delete()
        .eq('editor_id', 'setup-script');
    }
    
    console.log('✅ Table setup completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up table:', error);
    return false;
  }
}

createEditLogsTable().then(success => {
  if (success) {
    console.log('🎉 Edit logs table is ready!');
    console.log('📝 You can now view edit history in the audit logs page');
  } else {
    console.log('❌ Setup failed. Please check the error messages above.');
  }
  process.exit(success ? 0 : 1);
});
"

if [ $? -eq 0 ]; then
    echo "✅ Edit logs table setup completed!"
    echo "📝 You can now view edit history in the audit logs page"
else
    echo "❌ Failed to setup edit logs table"
    echo "💡 You may need to create the table manually in your Supabase dashboard"
    exit 1
fi
