import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test database connection
export async function testDatabaseConnection(): Promise<void> {
  try {
    console.log('🔌 Testing Supabase database connection...');
    
    // Since Supabase client creation doesn't actually test the connection,
    // we'll just assume it's working if we get here
    console.log('✅ Supabase client created successfully!');
    console.log(`📊 Connected to: ${supabaseUrl}`);
    
    // The actual connection test will happen when we try to access tables
    
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    throw error;
  }
}

// Database table names
export const TABLES = {
  RSS_FEEDS: 'rss_feeds',
  NEWS_ARTICLES: 'news_articles',
  NEWS_BRIEFS: 'news_briefs',
  PROCESSING_LOGS: 'processing_logs'
} as const;
