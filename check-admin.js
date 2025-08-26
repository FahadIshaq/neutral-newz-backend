const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user details...');
    
    // Get admin user details
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (error) {
      console.error('❌ Error fetching admin user:', error);
      return;
    }

    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Created:', user.created_at);
    console.log('   Password Hash:', user.password_hash.substring(0, 20) + '...');

    // Test password verification
    const bcrypt = require('bcryptjs');
    const testPassword = 'admin123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log('\n🔐 Password Test:');
    console.log('   Test Password:', testPassword);
    console.log('   Hash Valid:', isPasswordValid);
    
    if (isPasswordValid) {
      console.log('✅ Password hash is correct!');
    } else {
      console.log('❌ Password hash is incorrect!');
      console.log('   This means the password was not hashed properly during creation.');
    }

  } catch (error) {
    console.error('❌ Error checking admin user:', error);
  }
}

checkAdminUser();
