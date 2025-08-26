# Supabase Setup Instructions

This guide will help you set up Supabase for your Neutral News Backend.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `neutral-news-backend`
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
5. Click "Create new project"
6. Wait for project to be created (usually 2-3 minutes)

## 2. Get Your Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)
   - **Service role key** (starts with `eyJ...`)

## 3. Set Environment Variables

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 4. Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `database-schema.sql`
4. Click "Run" to execute the SQL

This will create:
- `rss_feeds` table with your RSS feed configurations
- `news_articles` table for storing processed articles
- `news_briefs` table for generated news briefs
- `processing_logs` table for tracking processing runs
- Proper indexes and triggers

## 5. Verify Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see 4 tables created
3. Check `rss_feeds` table - it should have 16 RSS feeds inserted
4. The other tables will be empty initially

## 6. Test Your Backend

1. Start your backend:
   ```bash
   npm run dev
   ```

2. Test the health endpoint:
   ```bash
   curl http://localhost:3001/health
   ```

3. Test the database stats endpoint:
   ```bash
   curl http://localhost:3001/api/stats
   ```

4. Test RSS feeds endpoint:
   ```bash
   curl http://localhost:3001/api/feeds
   ```

## 7. Process RSS Feeds

1. Test processing all feeds:
   ```bash
   curl -X POST http://localhost:3001/api/feeds/process-all
   ```

2. Check your Supabase dashboard:
   - `news_articles` table should now have articles
   - `news_briefs` table should have generated briefs
   - `processing_logs` table should have processing records

## 8. Monitor Processing

- **Processing Status**: `GET /api/feeds/status/processing`
- **Database Stats**: `GET /api/stats`
- **Processing Logs**: Check `processing_logs` table in Supabase

## 9. Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**
- Ensure `.env` file exists and has correct values
- Restart your backend after updating environment variables

**"Failed to fetch feeds"**
- Check Supabase project is active
- Verify API keys are correct
- Check network connectivity

**"Table doesn't exist"**
- Run the SQL schema again
- Check for any SQL errors in the Supabase logs

**"Permission denied"**
- Ensure you're using the correct API key
- Check Row Level Security (RLS) settings in Supabase

### Database Permissions

The schema includes Row Level Security (RLS). If you need to modify permissions:

1. Go to **Authentication** → **Policies** in Supabase
2. Adjust policies for each table as needed
3. For development, you can disable RLS temporarily

## 10. Production Considerations

- **Environment Variables**: Use production Supabase project
- **API Keys**: Rotate keys regularly
- **Monitoring**: Set up alerts for processing failures
- **Backup**: Enable Supabase backups
- **Scaling**: Monitor database performance and scale as needed

## 11. Next Steps

After successful setup:

1. **Customize RSS Feeds**: Modify feeds in the `rss_feeds` table
2. **Add Authentication**: Implement user management if needed
3. **Monitoring**: Set up logging and alerting
4. **Performance**: Add caching and optimization
5. **LLM Integration**: Add AI-powered brief generation

## Support

- **Supabase Docs**: [docs.supabase.com](https://docs.supabase.com)
- **Discord**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub**: [github.com/supabase/supabase](https://github.com/supabase/supabase)
