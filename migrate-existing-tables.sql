-- Migration script to add new columns to existing tables
-- Run this in your Supabase SQL editor after the main schema

-- Add new columns to existing news_briefs table
ALTER TABLE news_briefs 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'unpublished')),
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS llm_metadata JSONB DEFAULT '{}';

-- Add new columns to existing processing_logs table
ALTER TABLE processing_logs 
ADD COLUMN IF NOT EXISTS llm_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS llm_cost_usd DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT 'fact-check-v1.0';

-- Create the new brief_review_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS brief_review_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id TEXT,
  reviewer_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'publish', 'unpublish', 'edit')),
  previous_status TEXT,
  new_status TEXT,
  review_notes TEXT,
  changes_made JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing briefs to have 'published' status if they don't have a status
UPDATE news_briefs 
SET status = 'published' 
WHERE status IS NULL OR status = '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_briefs_status ON news_briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_reviewed_by ON news_briefs(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_brief_review_logs_brief_id ON brief_review_logs(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_review_logs_reviewer_id ON brief_review_logs(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_brief_review_logs_action ON brief_review_logs(action);
CREATE INDEX IF NOT EXISTS idx_brief_review_logs_timestamp ON brief_review_logs(timestamp);
