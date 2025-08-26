import { supabase } from '../lib/supabase';

export class SimpleTableService {
  
  async initializeTables(): Promise<void> {
    try {
      console.log('🔧 Checking database tables...');
      
      // Check if tables already exist
      const tablesExist = await this.checkTablesExist();
      
      if (tablesExist) {
        console.log('✅ All tables already exist and are functional');
        // Still try to create admin user if it doesn't exist
        await this.createInitialAdminUser();
        return;
      }
      
      // If tables don't exist, just check what's available
      console.log('📋 Some tables are missing, checking what exists...');
      await this.createRSSFeedsTable();
      await this.createNewsArticlesTable();
      await this.createNewsBriefsTable();
      await this.createProcessingLogsTable();
      await this.createAdminUsersTable();
      
      console.log('📝 Please run the SQL from database-schema.sql in your Supabase SQL Editor to create missing tables');
      
    } catch (error) {
      console.error('❌ Table check failed:', error);
      console.log('📝 Please check your Supabase connection and run the SQL from database-schema.sql if needed');
    }
  }
  
  private async checkTablesExist(): Promise<boolean> {
    try {
      // Try to query each table to see if they exist
      const tables = ['rss_feeds', 'news_articles', 'news_briefs', 'processing_logs', 'admin_users'];
      
      for (const table of tables) {
        console.log(`🔍 Checking if table ${table} exists...`);
        
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`📊 Response for ${table}:`, { data, error, count });
        
        if (error) {
          console.log(`❌ Table ${table} does not exist: ${error.message}`);
          console.log(`❌ Error details:`, error);
          return false;
        } else {
          console.log(`✅ Table ${table} exists with ${count || 0} rows`);
          
          // Skip insert testing for now to avoid network issues
          console.log(`✅ Table ${table} exists and is accessible`);
        }
      }
      
      console.log('✅ All tables exist and are functional');
      return true;
      
    } catch (error) {
      console.log('❌ Error checking tables:', error);
      return false;
    }
  }
  
  private async testTableInsert(tableName: string): Promise<boolean> {
    try {
      const testData = {
        id: 'test-insert-check',
        name: 'Test Insert',
        url: 'https://test.com',
        category: 'US_NATIONAL',
        active: true
      };
      
      const { error } = await supabase
        .from(tableName)
        .insert(testData);
      
      if (error) {
        console.log(`❌ Insert test failed for ${tableName}:`, error.message);
        return false;
      }
      
      // Clean up the test data
      await supabase
        .from(tableName)
        .delete()
        .eq('id', 'test-insert-check');
      
      console.log(`✅ Insert test passed for ${tableName}`);
      return true;
      
    } catch (error) {
      console.log(`❌ Insert test exception for ${tableName}:`, error);
      return false;
    }
  }
  
  private async createRSSFeedsTable(): Promise<void> {
    console.log('📋 Checking RSS Feeds table...');
    
    try {
      // Check if the table exists and has data
      const { data: existingFeeds, error: selectError } = await supabase
        .from('rss_feeds')
        .select('id')
        .limit(1);
      
      if (selectError) {
        console.log('📋 RSS Feeds table does not exist or is inaccessible');
        console.log('📝 Please run the SQL from database-schema.sql in your Supabase SQL Editor');
        console.log('📝 Or check your Supabase connection settings');
        throw new Error(`RSS Feeds table not accessible: ${selectError.message}`);
      }
      
      if (existingFeeds && existingFeeds.length > 0) {
        console.log(`✅ RSS Feeds table exists with ${existingFeeds.length} feeds`);
      } else {
        console.log('📋 RSS Feeds table exists but is empty');
        console.log('📝 Please populate it with initial data from database-schema.sql');
      }
      
    } catch (error) {
      console.error('❌ Failed to verify RSS Feeds table:', error);
      throw error;
    }
  }
  
  private async createNewsArticlesTable(): Promise<void> {
    console.log('📋 Checking News Articles table...');
    
    try {
      const { error } = await supabase
        .from('news_articles')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('📋 News Articles table does not exist or is inaccessible');
        console.log('📝 Please run the SQL from database-schema.sql in your Supabase SQL Editor');
      } else {
        console.log('✅ News Articles table exists');
      }
    } catch (error) {
      console.error('❌ Failed to verify News Articles table:', error);
    }
  }
  
  private async createNewsBriefsTable(): Promise<void> {
    console.log('📋 Checking News Briefs table...');
    
    try {
      const { error } = await supabase
        .from('news_briefs')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('📋 News Briefs table does not exist or is inaccessible');
        console.log('📝 Please run the SQL from database-schema.sql in your Supabase SQL Editor');
      } else {
        console.log('✅ News Briefs table exists');
      }
    } catch (error) {
      console.error('❌ Failed to verify News Briefs table:', error);
    }
  }
  
  private async createProcessingLogsTable(): Promise<void> {
    console.log('📋 Checking Processing Logs table...');
    
    try {
      const { error } = await supabase
        .from('processing_logs')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('📋 Processing Logs table does not exist or is inaccessible');
        console.log('📝 Please run the SQL from database-schema.sql in your Supabase SQL Editor');
      } else {
        console.log('✅ Processing Logs table exists');
      }
    } catch (error) {
      console.error('❌ Failed to verify Processing Logs table:', error);
    }
  }
  
  private async createAdminUsersTable(): Promise<void> {
    console.log('📋 Checking Admin Users table...');
    
    try {
      const { error } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('📋 Admin Users table does not exist or is inaccessible');
        console.log('📝 Please run the SQL from database-schema.sql in your Supabase SQL Editor');
      } else {
        console.log('✅ Admin Users table exists');
      }
    } catch (error) {
      console.error('❌ Failed to verify Admin Users table:', error);
    }
  }
  
  private async createTableWithSQL(tableName: string, sql: string): Promise<void> {
    console.log(`🔧 Creating table ${tableName} with SQL...`);
    
    // Since we can't use RPC calls, we'll need to create the table manually
    // For now, let's just log the SQL and ask the user to run it
    console.log(`📝 Please run this SQL in your Supabase SQL Editor to create table ${tableName}:`);
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    
    // Wait a bit for the user to potentially create the table
    console.log('⏳ Waiting 10 seconds for table creation...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if the table was created
    const tableExists = await this.checkTableExists(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} was not created. Please run the SQL above in your Supabase SQL Editor.`);
    }
  }
  
  private getRSSFeedsTableSQL(): string {
    return `
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
    `;
  }
  
  private getNewsArticlesTableSQL(): string {
    return `
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
    `;
  }
  
  private getNewsBriefsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS news_briefs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        source_articles TEXT[] NOT NULL,
        category TEXT NOT NULL,
        published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
  }
  
  private getProcessingLogsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS processing_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        success BOOLEAN NOT NULL,
        articles_processed INTEGER DEFAULT 0,
        briefs_generated INTEGER DEFAULT 0,
        errors TEXT[] DEFAULT '{}',
        processing_time_ms INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
  }

  private getAdminUsersTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
  }
  
  private async insertInitialFeeds(): Promise<void> {
    console.log('📰 Inserting initial RSS feeds...');
    
    const initialFeeds = [
      // US National News
      { id: 'npr-national', name: 'NPR National', url: 'https://feeds.npr.org/1003/rss.xml', category: 'US_NATIONAL' },
      { id: 'npr-politics', name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml', category: 'US_NATIONAL' },
      { id: 'pbs-headlines', name: 'PBS NewsHour Headlines', url: 'https://www.pbs.org/newshour/feeds/rss/headlines', category: 'US_NATIONAL' },
      { id: 'pbs-politics', name: 'PBS NewsHour Politics', url: 'https://www.pbs.org/newshour/feeds/rss/politics', category: 'US_NATIONAL' },
      { id: 'white-house', name: 'White House Press', url: 'https://www.whitehouse.gov/news/feed/', category: 'US_NATIONAL' },
      { id: 'state-dept', name: 'State Department', url: 'https://www.state.gov/feed/', category: 'US_NATIONAL' },
      { id: 'defense-dept', name: 'Defense Department', url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=944&max=20', category: 'US_NATIONAL' },
      { id: 'nytimes-politics', name: 'NYT Politics', url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/politics/rss.xml', category: 'US_NATIONAL' },
      { id: 'politico-picks', name: 'Politico Picks', url: 'https://www.politico.com/rss/politicopicks.xml', category: 'US_NATIONAL' },
      { id: 'rollcall', name: 'Roll Call', url: 'https://rollcall.com/feed/', category: 'US_NATIONAL' },
      
      // International News
      { id: 'bbc-world', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'INTERNATIONAL' },
      { id: 'aljazeera-world', name: 'Al Jazeera World', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'INTERNATIONAL' },
      { id: 'france24-world', name: 'France 24 World', url: 'https://www.france24.com/en/rss', category: 'INTERNATIONAL' },
      { id: 'un-news', name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', category: 'INTERNATIONAL' },
      { id: 'npr-world', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', category: 'INTERNATIONAL' },
      
      // Finance/Macro
      { id: 'federal-reserve', name: 'Federal Reserve Press', url: 'https://www.federalreserve.gov/feeds/press_all.xml', category: 'FINANCE_MACRO' },
      { id: 'npr-economy', name: 'NPR Economy', url: 'https://feeds.npr.org/1017/rss.xml', category: 'FINANCE_MACRO' },
      { id: 'pbs-economy', name: 'PBS NewsHour Economy', url: 'https://www.pbs.org/newshour/feeds/rss/economy', category: 'FINANCE_MACRO' },
      { id: 'imf-press', name: 'IMF Press', url: 'https://www.imf.org/external/cntpst/prfeed.aspx', category: 'FINANCE_MACRO' }
    ];
    
    try {
      const { error } = await supabase
        .from('rss_feeds')
        .upsert(initialFeeds, { onConflict: 'id' });
      
      if (error) {
        throw new Error(`Failed to insert initial feeds: ${error.message}`);
      }
      
      console.log('✅ Initial RSS feeds inserted successfully');
    } catch (error) {
      console.error('❌ Failed to insert initial feeds:', error);
      throw error;
    }
  }

  private async createInitialAdminUser(): Promise<void> {
    console.log('👤 Creating initial admin user...');
    
    try {
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

      // Import bcrypt here to avoid circular dependency
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);

      const { error: createError } = await supabase
        .from('admin_users')
        .insert({
          username: 'admin',
          email: 'admin@neutralnews.com',
          password_hash: hashedPassword,
          role: 'admin'
        });

      if (createError) {
        throw new Error(`Failed to create admin user: ${createError.message}`);
      }

      console.log('✅ Initial admin user created successfully');
      console.log('🔑 Default credentials: admin / admin123');
      console.log('⚠️  Please change the password after first login!');
    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
      // Don't throw error here as it's not critical for the system to start
    }
  }
  
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      return !error;
    } catch {
      return false;
    }
  }
}
