const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createAdminUsersTable() {
  try {
    console.log('🔧 Creating admin_users table...');
    
    // Create the admin_users table using SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (error) {
      console.log('⚠️  RPC method failed, trying direct SQL...');
      
      // Try using the SQL editor approach
      console.log('📝 Please run this SQL in your Supabase SQL editor:');
      console.log(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      return;
    }

    console.log('✅ Admin users table created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create admin_users table:', error);
    console.log('📝 Please run this SQL in your Supabase SQL editor:');
    console.log(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }
}

createAdminUsersTable();
