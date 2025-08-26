import { supabase } from '../lib/supabase';
import { SQLExecutionService } from './sqlExecutionService';

export class TableInitializationService {
  
  private sqlService: SQLExecutionService;
  
  constructor() {
    this.sqlService = new SQLExecutionService();
  }
  
  async initializeTables(): Promise<void> {
    console.log('🔧 Starting table initialization...');
    
    try {
      // Create RSS Feeds table
      await this.createRSSFeedsTable();
      
      // Create News Articles table
      await this.createNewsArticlesTable();
      
      // Create News Briefs table
      await this.createNewsBriefsTable();
      
      // Create Processing Logs table
      await this.createProcessingLogsTable();
      
      // Create indexes
      await this.createIndexes();
      
      // Create triggers
      await this.createTriggers();
      
      // Insert initial RSS feeds data
      await this.insertInitialFeeds();
      
      console.log('✅ All tables initialized successfully!');
      
    } catch (error) {
      console.error('❌ Table initialization failed:', error);
      throw error;
    }
  }
  
  private async createRSSFeedsTable(): Promise<void> {
    const createTableSQL = `
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
    
    await this.sqlService.createTableIfNotExists('rss_feeds', createTableSQL);
  }
  
  private async createNewsArticlesTable(): Promise<void> {
    const createTableSQL = `
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
    
    await this.sqlService.createTableIfNotExists('news_articles', createTableSQL);
  }
  
  private async createNewsBriefsTable(): Promise<void> {
    const createTableSQL = `
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
    
    await this.sqlService.createTableIfNotExists('news_briefs', createTableSQL);
  }
  
  private async createProcessingLogsTable(): Promise<void> {
    const createTableSQL = `
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
    
    await this.sqlService.createTableIfNotExists('processing_logs', createTableSQL);
  }
  
  private async createIndexes(): Promise<void> {
    console.log('🔍 Creating database indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_rss_feeds_category ON rss_feeds(category);',
      'CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(active);',
      'CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);',
      'CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);',
      'CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);',
      'CREATE INDEX IF NOT EXISTS idx_news_briefs_category ON news_briefs(category);',
      'CREATE INDEX IF NOT EXISTS idx_news_briefs_published_at ON news_briefs(published_at);'
    ];
    
    for (const indexSql of indexes) {
      try {
        await this.sqlService.executeSQL(indexSql);
      } catch (error) {
        console.warn('⚠️  Warning: Failed to create index:', error);
      }
    }
    
    console.log('✅ Database indexes created/verified');
  }
  
  private async createTriggers(): Promise<void> {
    console.log('⚡ Creating database triggers...');
    
    try {
      // Create updated_at trigger function
      const functionSQL = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `;
      
      await this.sqlService.executeSQL(functionSQL);
      
      // Create triggers for each table
      const triggers = [
        'CREATE TRIGGER update_rss_feeds_updated_at BEFORE UPDATE ON rss_feeds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
        'CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON news_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
        'CREATE TRIGGER update_news_briefs_updated_at BEFORE UPDATE ON news_briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();'
      ];
      
      for (const triggerSql of triggers) {
        try {
          await this.sqlService.executeSQL(triggerSql);
        } catch (error) {
          console.warn('⚠️  Warning: Failed to create trigger:', error);
        }
      }
      
      console.log('✅ Database triggers created/verified');
      
    } catch (error) {
      console.warn('⚠️  Warning: Failed to create trigger function:', error);
    }
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
    
    await this.sqlService.insertData('rss_feeds', initialFeeds);
    console.log('✅ Initial RSS feeds inserted/verified');
  }
  
  async checkTableExists(tableName: string): Promise<boolean> {
    return this.sqlService.checkTableExists(tableName);
  }
  
  async getTableCount(tableName: string): Promise<number> {
    return this.sqlService.getTableCount(tableName);
  }
}
