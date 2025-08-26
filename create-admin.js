const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (existingUser) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password using bcrypt
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const { data: newUser, error: createError } = await supabase
      .from('admin_users')
      .insert({
        username: 'admin',
        email: 'admin@neutralnews.com',
        password_hash: hashedPassword,
        role: 'admin'
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create admin user: ${createError.message}`);
    }

    console.log('✅ Admin user created successfully');
    console.log('🔑 Username: admin');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
}

createAdminUser();
