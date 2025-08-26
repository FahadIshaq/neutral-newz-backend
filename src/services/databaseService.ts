import { supabase, TABLES } from '../lib/supabase';
import { RSSFeed, NewsArticle, NewsBrief, ProcessingResult } from '../types';

export class DatabaseService {
  
  // RSS Feeds
  async getFeeds(): Promise<RSSFeed[]> {
    const { data, error } = await supabase
      .from(TABLES.RSS_FEEDS)
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching feeds:', error);
      throw new Error(`Failed to fetch feeds: ${error.message}`);
    }
    
    console.log(`📰 Retrieved ${data?.length || 0} RSS feeds from database`);
    return data || [];
  }

  async getFeedsByCategory(category: string): Promise<RSSFeed[]> {
    const { data, error } = await supabase
      .from(TABLES.RSS_FEEDS)
      .select('*')
      .eq('category', category)
      .eq('active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching feeds by category:', error);
      throw new Error(`Failed to fetch feeds by category: ${error.message}`);
    }
    
    console.log(`📰 Retrieved ${data?.length || 0} ${category} feeds from database`);
    return data || [];
  }

  async getFeed(id: string): Promise<RSSFeed | null> {
    const { data, error } = await supabase
      .from(TABLES.RSS_FEEDS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching feed:', error);
      return null;
    }
    
    return data;
  }

  async updateFeedLastChecked(id: string, lastChecked: Date, lastError?: string): Promise<void> {
    const updateData: any = { last_checked: lastChecked.toISOString() };
    if (lastError !== undefined) {
      updateData.last_error = lastError;
    }

    const { error } = await supabase
      .from(TABLES.RSS_FEEDS)
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating feed last checked:', error);
    } else {
      console.log(`✅ Updated feed ${id} last checked timestamp`);
    }
  }

  // News Articles
  async saveArticles(articles: NewsArticle[]): Promise<void> {
    if (articles.length === 0) return;

    const { error } = await supabase
      .from(TABLES.NEWS_ARTICLES)
      .upsert(articles.map(article => ({
        id: article.id,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        source: article.source,
        category: article.category,
        published_at: article.publishedAt.toISOString(),
        processed_at: article.processedAt.toISOString(),
        brief_generated: article.briefGenerated,
        brief_content: article.briefContent,
        tags: article.tags
      })), {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error saving articles:', error);
      throw new Error(`Failed to save articles: ${error.message}`);
    }
    
    console.log(`💾 Saved ${articles.length} articles to database`);
  }

  async getArticlesByFeed(feedId: string, limit: number = 50): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_ARTICLES)
      .select('*')
      .eq('source', feedId)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching articles by feed:', error);
      throw new Error(`Failed to fetch articles by feed: ${error.message}`);
    }
    
    return (data || []).map(article => ({
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      source: article.source,
      category: article.category,
      publishedAt: new Date(article.published_at),
      processedAt: new Date(article.processed_at),
      briefGenerated: article.brief_generated,
      briefContent: article.brief_content,
      tags: article.tags || []
    }));
  }

  async getArticlesByCategory(category: string, limit: number = 100): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_ARTICLES)
      .select('*')
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching articles by category:', error);
      throw new Error(`Failed to fetch articles by category: ${error.message}`);
    }
    
    return (data || []).map(article => ({
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      source: article.source,
      category: article.category,
      publishedAt: new Date(article.published_at),
      processedAt: new Date(article.processed_at),
      briefGenerated: article.brief_generated,
      briefContent: article.brief_content,
      tags: article.tags || []
    }));
  }

  // News Briefs
  async saveBriefs(briefs: NewsBrief[]): Promise<void> {
    if (briefs.length === 0) return;

    const { error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .upsert(briefs.map(brief => ({
        id: brief.id,
        title: brief.title,
        summary: brief.summary,
        source_articles: brief.sourceArticles,
        category: brief.category,
        published_at: brief.publishedAt.toISOString(),
        tags: brief.tags,
        status: brief.status || 'pending',
        reviewed_by: brief.reviewedBy,
        reviewed_at: brief.reviewedAt?.toISOString(),
        review_notes: brief.reviewNotes,
        llm_metadata: brief.llmMetadata || {},
        created_at: brief.createdAt.toISOString(),
        updated_at: brief.updatedAt.toISOString()
      })), {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error saving briefs:', error);
      throw new Error(`Failed to save briefs: ${error.message}`);
    }
    
    console.log(`💾 Saved ${briefs.length} news briefs to database`);
  }

  async getBriefs(limit: number = 50): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching briefs:', error);
      throw new Error(`Failed to fetch briefs: ${error.message}`);
    }
    
    return (data || []).map(brief => ({
      id: brief.id,
      title: brief.title,
      summary: brief.summary,
      sourceArticles: brief.source_articles,
      category: brief.category,
      publishedAt: new Date(brief.published_at),
      tags: brief.tags || [],
      status: brief.status || 'pending',
      reviewedBy: brief.reviewed_by,
      reviewedAt: brief.reviewed_at ? new Date(brief.reviewed_at) : undefined,
      reviewNotes: brief.review_notes,
      llmMetadata: brief.llm_metadata || undefined,
      createdAt: brief.created_at ? new Date(brief.created_at) : new Date(),
      updatedAt: brief.updated_at ? new Date(brief.updated_at) : new Date()
    }));
  }

  async getBriefsByCategory(category: string, limit: number = 50): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching briefs by category:', error);
      throw new Error(`Failed to fetch briefs by category: ${error.message}`);
    }
    
    return (data || []).map(brief => ({
      id: brief.id,
      title: brief.title,
      summary: brief.summary,
      sourceArticles: brief.source_articles,
      category: brief.category,
      publishedAt: new Date(brief.published_at),
      tags: brief.tags || [],
      status: brief.status || 'pending',
      reviewedBy: brief.reviewed_by,
      reviewedAt: brief.reviewed_at ? new Date(brief.reviewed_at) : undefined,
      reviewNotes: brief.review_notes,
      llmMetadata: brief.llm_metadata || undefined,
      createdAt: brief.created_at ? new Date(brief.created_at) : new Date(),
      updatedAt: brief.updated_at ? new Date(brief.updated_at) : new Date()
    }));
  }

  async getLatestBriefs(limit: number = 10): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching latest briefs:', error);
      throw new Error(`Failed to fetch latest briefs: ${error.message}`);
    }
    
    return (data || []).map(brief => ({
      id: brief.id,
      title: brief.title,
      summary: brief.summary,
      sourceArticles: brief.source_articles,
      category: brief.category,
      publishedAt: new Date(brief.published_at),
      tags: brief.tags || [],
      status: brief.status || 'pending',
      reviewedBy: brief.reviewed_by,
      reviewedAt: brief.reviewed_at ? new Date(brief.reviewed_at) : undefined,
      reviewNotes: brief.review_notes,
      llmMetadata: brief.llm_metadata || undefined,
      createdAt: brief.created_at ? new Date(brief.created_at) : new Date(),
      updatedAt: brief.updated_at ? new Date(brief.updated_at) : new Date()
    }));
  }

  // Processing Logs
  async saveProcessingLog(result: ProcessingResult, processingTimeMs: number): Promise<void> {
    const { error } = await supabase
      .from(TABLES.PROCESSING_LOGS)
      .insert({
        success: result.success,
        articles_processed: result.articlesProcessed,
        briefs_generated: result.briefsGenerated,
        errors: result.errors,
        processing_time_ms: processingTimeMs,
        llm_tokens_used: result.llmTokensUsed || 0,
        llm_cost_usd: result.llmCostUsd || 0,
        model_version: result.modelVersion || 'gpt-4o',
        prompt_version: result.promptVersion || 'bias-strip-v2.1',
        timestamp: result.timestamp.toISOString()
      });
    
    if (error) {
      console.error('Error saving processing log:', error);
    } else {
      console.log(`📝 Saved processing log: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.articlesProcessed} articles, ${result.briefsGenerated} briefs`);
    }
  }

  // Utility methods
  async getDatabaseStats(): Promise<{
    totalFeeds: number;
    activeFeeds: number;
    totalArticles: number;
    totalBriefs: number;
  }> {
    const [feedsResult, articlesResult, briefsResult] = await Promise.all([
      supabase.from(TABLES.RSS_FEEDS).select('id', { count: 'exact' }),
      supabase.from(TABLES.NEWS_ARTICLES).select('id', { count: 'exact' }),
      supabase.from(TABLES.NEWS_BRIEFS).select('id', { count: 'exact' })
    ]);

    const activeFeedsResult = await supabase
      .from(TABLES.RSS_FEEDS)
      .select('id', { count: 'exact' })
      .eq('active', true);

    const stats = {
      totalFeeds: feedsResult.count || 0,
      activeFeeds: activeFeedsResult.count || 0,
      totalArticles: articlesResult.count || 0,
      totalBriefs: briefsResult.count || 0
    };

    console.log(`📊 Database Stats: ${stats.totalFeeds} feeds, ${stats.activeFeeds} active, ${stats.totalArticles} articles, ${stats.totalBriefs} briefs`);
    
    return stats;
  }
}
