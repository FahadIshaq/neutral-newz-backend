-- Create brief_edit_logs table for tracking brief editing history
CREATE TABLE IF NOT EXISTS brief_edit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brief_id UUID REFERENCES news_briefs(id) ON DELETE CASCADE,
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

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_brief_edit_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER trigger_update_brief_edit_logs_timestamp
    BEFORE UPDATE ON brief_edit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_brief_edit_logs_timestamp();

-- Insert some sample data for testing (optional)
INSERT INTO brief_edit_logs (brief_id, action, editor_id, previous_content, new_content, edit_notes, metadata)
VALUES 
    (
        (SELECT id FROM news_briefs LIMIT 1),
        'edit',
        'admin@example.com',
        '{"title": "Original Title", "summary": "Original summary"}',
        '{"title": "Updated Title", "summary": "Updated summary"}',
        'Updated title and summary for better clarity',
        '{"ip_address": "127.0.0.1", "user_agent": "Mozilla/5.0"}'
    ),
    (
        (SELECT id FROM news_briefs LIMIT 1 OFFSET 1),
        'revise_ai',
        'ai-service',
        '{"title": "AI Original", "summary": "AI original summary"}',
        '{"title": "AI Revised", "summary": "AI revised summary with improvements"}',
        'AI revision completed successfully',
        '{"model": "gpt-4o-mini", "tokens_used": 150, "cost": 0.002}'
    )
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE brief_edit_logs TO postgres;
GRANT ALL PRIVILEGES ON SEQUENCE brief_edit_logs_id_seq TO postgres;
