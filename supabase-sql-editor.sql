-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This will create the brief_edit_logs table for tracking all brief editing actions

-- Create the brief_edit_logs table
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

-- Insert sample data for testing (only if you have existing briefs)
INSERT INTO brief_edit_logs (brief_id, action, editor_id, previous_content, new_content, edit_notes, metadata)
SELECT 
    id,
    'edit',
    'admin@example.com',
    '{"title": "Original Title", "summary": "Original summary"}'::jsonb,
    '{"title": "Updated Title", "summary": "Updated summary"}'::jsonb,
    'Sample edit for testing',
    '{"source": "setup", "test": true}'::jsonb
FROM news_briefs 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON brief_edit_logs TO authenticated;
GRANT ALL ON brief_edit_logs TO anon;

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE brief_edit_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy for authenticated users to read all logs
-- CREATE POLICY "Users can view all edit logs" ON brief_edit_logs
--     FOR SELECT USING (auth.role() = 'authenticated');

-- Create a policy for authenticated users to insert logs
-- CREATE POLICY "Users can insert edit logs" ON brief_edit_logs
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'brief_edit_logs'
ORDER BY ordinal_position;

-- Check if sample data was inserted
SELECT COUNT(*) as total_logs FROM brief_edit_logs;
