const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking admin users in database...');
    
    // Get all admin users
    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, email, role, created_at');

    if (error) {
      console.error('❌ Error fetching admin users:', error);
      return;
    }

    if (users && users.length > 0) {
      console.log(`✅ Found ${users.length} admin user(s):`);
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
      });
    } else {
      console.log('❌ No admin users found in database');
    }

    // Test authentication with default credentials
    console.log('\n🔐 Testing authentication with default credentials...');
    
    const bcrypt = require('bcryptjs');
    const testPassword = 'admin123';
    
    // Get admin user
    const { data: adminUser, error: authError } = await supabase
      .from('admin_users')
      .select('username, password_hash')
      .eq('username', 'admin')
      .single();

    if (authError) {
      console.error('❌ Error fetching admin user:', authError);
      return;
    }

    if (adminUser) {
      const isValidPassword = await bcrypt.compare(testPassword, adminUser.password_hash);
      if (isValidPassword) {
        console.log('✅ Default credentials work: admin/admin123');
      } else {
        console.log('❌ Default password does not match');
      }
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to check admin users:', error);
  }
}

checkAdminUsers();
