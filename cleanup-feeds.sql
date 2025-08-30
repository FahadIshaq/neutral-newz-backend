-- Cleanup RSS Feeds SQL Script for Neutral News Backend
-- Run this in your Supabase SQL editor to clean up and populate with only the desired feeds

-- Step 1: Clear all existing RSS feeds
DELETE FROM rss_feeds;

-- Step 2: Reset the sequence (if using auto-increment)
-- ALTER SEQUENCE rss_feeds_id_seq RESTART WITH 1;

-- Step 3: Insert only the desired feeds
INSERT INTO rss_feeds (id, name, url, category, active) VALUES
  -- US National News
  ('npr-national', 'NPR National', 'https://feeds.npr.org/1003/rss.xml', 'US_NATIONAL', true),
  ('npr-politics', 'NPR Politics', 'https://feeds.npr.org/1014/rss.xml', 'US_NATIONAL', true),
  ('pbs-headlines', 'PBS NewsHour Headlines', 'https://www.pbs.org/newshour/feeds/rss/headlines', 'US_NATIONAL', true),
  ('pbs-politics', 'PBS NewsHour Politics', 'https://www.pbs.org/newshour/feeds/rss/politics', 'US_NATIONAL', true),
  ('white-house', 'White House Press', 'https://www.whitehouse.gov/presidential-actions/feed/', 'US_NATIONAL', true),
  ('doj', 'DOJ News', 'https://www.justice.gov/news/rss?type=press_release&m=1', 'US_NATIONAL', true),
  ('congress', 'Congress', 'https://www.congress.gov/rss', 'US_NATIONAL', true),
  
  -- International News
  ('bbc-world', 'BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'INTERNATIONAL', true),
  ('cnn-world', 'CNN World', 'http://rss.cnn.com/rss/cnn_topstories.rss', 'INTERNATIONAL', true),
  ('un-news', 'UN News', 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', 'INTERNATIONAL', true),
  ('npr-world', 'NPR World', 'https://feeds.npr.org/1004/rss.xml', 'INTERNATIONAL', true),
  
  -- International Finance/Macro
  ('federal-reserve', 'Federal Reserve Press', 'https://www.federalreserve.gov/feeds/press_all.xml', 'FINANCE_MACRO', true),
  ('us-treasury', 'US Treasury Press', 'https://treasurydirect.gov/TA_WS/securities/announced/rss', 'FINANCE_MACRO', true),
  ('npr-economy', 'NPR Economy', 'https://feeds.npr.org/1017/rss.xml', 'FINANCE_MACRO', true),
  ('pbs-economy', 'PBS NewsHour Economy', 'https://www.pbs.org/newshour/feeds/rss/economy', 'FINANCE_MACRO', true),
  ('imf-press', 'IMF Press', 'https://www.imf.org/external/cntpst/prfeed.aspx', 'FINANCE_MACRO', true);

-- Step 4: Verify the cleanup
SELECT 
  category,
  COUNT(*) as feed_count,
  STRING_AGG(name, ', ' ORDER BY name) as feeds
FROM rss_feeds 
GROUP BY category 
ORDER BY category;

-- Step 5: Show total count
SELECT COUNT(*) as total_feeds FROM rss_feeds;

-- Step 6: Show all feeds with details
SELECT 
  id,
  name,
  category,
  active,
  created_at
FROM rss_feeds 
ORDER BY category, name;
