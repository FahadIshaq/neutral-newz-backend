-- Complete Database Cleanup Script for Neutral News Backend
-- ⚠️  WARNING: This will DELETE ALL DATA from your database
-- Run this in your Supabase SQL editor to completely start fresh

-- Step 1: Disable foreign key checks temporarily (if needed)
-- SET session_replication_role = replica;

-- Step 2: Clear all existing data from all tables
-- Clear processing logs first (they reference other tables)
DELETE FROM processing_logs;

-- Clear news briefs (they reference articles)
DELETE FROM news_briefs;

-- Clear news articles (they reference feeds)
DELETE FROM news_articles;

-- Clear RSS feeds
DELETE FROM rss_feeds;

-- Clear admin users (keep at least one for login)
-- DELETE FROM admin_users;

-- Step 3: Reset sequences (if using auto-increment)
-- ALTER SEQUENCE IF EXISTS processing_logs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS news_briefs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS news_articles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS rss_feeds_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS admin_users_id_seq RESTART WITH 1;

-- Step 4: Verify all tables are empty
SELECT 'processing_logs' as table_name, COUNT(*) as record_count FROM processing_logs
UNION ALL
SELECT 'news_briefs' as table_name, COUNT(*) as record_count FROM news_briefs
UNION ALL
SELECT 'news_articles' as table_name, COUNT(*) as record_count FROM news_articles
UNION ALL
SELECT 'rss_feeds' as table_name, COUNT(*) as record_count FROM rss_feeds
UNION ALL
SELECT 'admin_users' as table_name, COUNT(*) as record_count FROM admin_users;

-- Step 5: Show table structure (for verification)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('rss_feeds', 'news_articles', 'news_briefs', 'processing_logs', 'admin_users')
ORDER BY table_name, ordinal_position;

-- Step 6: Re-enable foreign key checks
-- SET session_replication_role = DEFAULT;

-- ✅ Database is now completely clean and ready for fresh data!
