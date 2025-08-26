# Database Setup Guide

## Issue Resolution

The backend was failing to start due to database table initialization issues. This guide will help you resolve them.

## Prerequisites

1. **Supabase Project**: Make sure you have a Supabase project set up
2. **Environment Variables**: Check your `.env` file has the correct Supabase credentials
3. **Backend Running**: The backend should be accessible at `http://localhost:3001`

## Step 1: Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `database-schema.sql`
4. Click **Run** to execute the SQL

This will create:
- `rss_feeds` table with initial RSS feed data
- `news_articles` table
- `news_briefs` table  
- `processing_logs` table
- `admin_users` table

## Step 2: Install Dependencies

```bash
cd backend
npm install
```

## Step 3: Start the Backend

```bash
npm run dev
```

The backend should now start without the "fetch failed" errors.

## Step 4: Run Setup Script (Optional)

If you want to populate additional data or verify everything is working:

```bash
node setup-database.js
```

This script will:
- Check if the backend is running
- Create an admin user (if it doesn't exist)
- Populate initial RSS feeds
- Test the login functionality

## Step 5: Test the Frontend

1. In another terminal, start the admin frontend:
   ```bash
   cd admin
   npm run dev
   ```

2. Visit `http://localhost:3000`
3. Login with the credentials from your `.env` file or the default:
   - Username: `admin`
   - Password: `admin123`

## Troubleshooting

### "fetch failed" Error
- This usually means the Supabase client can't connect
- Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Verify your Supabase project is active

### Tables Don't Exist
- Make sure you ran the SQL from `database-schema.sql`
- Check the Supabase SQL Editor for any error messages
- Verify you have the correct permissions on your Supabase project

### Backend Won't Start
- Check the console for specific error messages
- Verify all environment variables are set
- Make sure port 3001 is available

### Frontend Can't Connect
- Ensure the backend is running on port 3001
- Check that `NEXT_PUBLIC_API_URL` is set to `http://localhost:3001` in the admin frontend

## Environment Variables

Make sure your `.env` file contains:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
PORT=3001
```

## Next Steps

Once everything is working:
1. The admin panel should show persistent navigation tabs
2. RSS feeds should load without errors
3. You can process feeds and generate news briefs
4. The system will maintain consistent header/footer across all pages

## Support

If you continue to have issues:
1. Check the backend console for specific error messages
2. Verify your Supabase connection
3. Ensure all tables were created successfully
4. Check that the initial data was inserted

