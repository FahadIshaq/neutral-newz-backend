-- Database schema for Neutral News Backend
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'OLbKDhtycCdWuCvU2GRAHbzVQ52nesunpoie10xOuPhuBoUW62XEJN0YeliYT2leM+jI7UksCi6zk/hnVC2QsQ==';

-- RSS Feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('US_NATIONAL', 'INTERNATIONAL', 'FINANCE_MACRO')),
  active BOOLEAN DEFAULT true,
  last_checked TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News Articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  brief_generated BOOLEAN DEFAULT false,
  brief_content TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News Briefs table
CREATE TABLE IF NOT EXISTS news_briefs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_articles TEXT[] NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('US_NATIONAL', 'INTERNATIONAL', 'FINANCE_MACRO')),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'unpublished')),
  reviewed_by TEXT REFERENCES admin_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  llm_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Logs table
CREATE TABLE IF NOT EXISTS processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  success BOOLEAN NOT NULL,
  articles_processed INTEGER DEFAULT 0,
  briefs_generated INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  processing_time_ms INTEGER,
  llm_tokens_used INTEGER DEFAULT 0,
  llm_cost_usd DECIMAL(10,4) DEFAULT 0,
  model_version TEXT DEFAULT 'gpt-4o',
  prompt_version TEXT DEFAULT 'bias-strip-v2.1',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brief Review Logs table
CREATE TABLE IF NOT EXISTS brief_review_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id TEXT REFERENCES news_briefs(id) ON DELETE CASCADE,
  reviewer_id TEXT REFERENCES admin_users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'publish', 'unpublish', 'edit')),
  previous_status TEXT,
  new_status TEXT,
  review_notes TEXT,
  changes_made JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rss_feeds_category ON rss_feeds(category);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(active);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_news_briefs_category ON news_briefs(category);
CREATE INDEX IF NOT EXISTS idx_news_briefs_published_at ON news_briefs(published_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_rss_feeds_updated_at BEFORE UPDATE ON rss_feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_briefs_updated_at BEFORE UPDATE ON news_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial RSS feeds data
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
  ('imf-press', 'IMF Press', 'https://www.imf.org/en/rss-list/feed?category=FANDD_ENG', 'FINANCE_MACRO', true)
ON CONFLICT (id) DO NOTHING;
