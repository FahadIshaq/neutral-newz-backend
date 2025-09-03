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
    try {
      const { data, error } = await supabase
        .from(TABLES.RSS_FEEDS)
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully
      
      if (error) {
        console.error('Error fetching feed:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Exception fetching feed:', error);
      return null;
    }
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

    // Deduplicate articles by ID and URL to prevent constraint violations
    const uniqueArticles = this.deduplicateArticles(articles);
    
    if (uniqueArticles.length === 0) {
      console.log('No unique articles to save after deduplication');
      return;
    }

    console.log(`💾 Attempting to save ${uniqueArticles.length} unique articles (from ${articles.length} total)`);

    // Process articles in smaller batches to avoid constraint violations
    const batchSize = 50;
    let savedCount = 0;
    
    for (let i = 0; i < uniqueArticles.length; i += batchSize) {
      const batch = uniqueArticles.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from(TABLES.NEWS_ARTICLES)
          .upsert(batch.map(article => ({
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
            onConflict: 'id',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`Error saving batch ${Math.floor(i / batchSize) + 1}:`, error);
          // Continue with next batch instead of failing completely
          continue;
        }
        
        savedCount += batch.length;
        console.log(`✅ Saved batch ${Math.floor(i / batchSize) + 1}: ${batch.length} articles`);
        
      } catch (error) {
        console.error(`Exception saving batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch
        continue;
      }
    }
    
    console.log(`💾 Successfully saved ${savedCount} out of ${uniqueArticles.length} articles`);
  }



  /**
   * Deduplicate articles by ID and URL to prevent constraint violations
   */
  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    const uniqueArticles: NewsArticle[] = [];

    for (const article of articles) {
      // Skip if we've already seen this ID or URL
      if (seenIds.has(article.id) || seenUrls.has(article.url)) {
        continue;
      }
      
      seenIds.add(article.id);
      seenUrls.add(article.url);
      uniqueArticles.push(article);
    }

    if (uniqueArticles.length < articles.length) {
      console.log(`🔄 Deduplicated articles: ${articles.length} → ${uniqueArticles.length}`);
    }

    return uniqueArticles;
  }

  async getArticlesByFeed(feedId: string, limit: number = 50, timeRange: number = -1): Promise<NewsArticle[]> {
    let query = supabase
      .from(TABLES.NEWS_ARTICLES)
      .select('*')
      .eq('source', feedId)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { data, error } = await query;
    
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

  async getArticlesByCategory(category: string, limit: number = 100, timeRange: number = -1): Promise<NewsArticle[]> {
    let query = supabase
      .from(TABLES.NEWS_ARTICLES)
      .select('*')
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { data, error } = await query;
    
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
        status: brief.status || 'published',
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
      status: brief.status || 'published',
      llmMetadata: brief.llm_metadata || undefined,
      createdAt: brief.created_at ? new Date(brief.created_at) : new Date(),
      updatedAt: brief.updated_at ? new Date(brief.updated_at) : new Date()
    }));
  }

  async getBriefsByCategory(category: string, limit: number = 50, timeRange: number = -1): Promise<NewsBrief[]> {
    let query = supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching briefs by category:', error);
      throw new Error(`Failed to fetch briefs by category: ${error.message}`);
    }
    
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async getBriefsByCategoryPaginated(category: string, limit: number = 50, timeRange: number = -1, offset: number = 0): Promise<NewsBrief[]> {
    let query = supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .eq('category', category)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching briefs by category paginated:', error);
      throw new Error(`Failed to fetch briefs by category paginated: ${error.message}`);
    }
    
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async getBriefsByCategoryCount(category: string, timeRange: number = -1): Promise<number> {
    let query = supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*', { count: 'exact', head: true })
      .eq('category', category);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { count, error } = await query;
    
    if (error) {
      console.error('Error fetching briefs by category count:', error);
      throw new Error(`Failed to fetch briefs by category count: ${error.message}`);
    }
    
    return count || 0;
  }

  async getLatestBriefs(limit: number = 10, timeRange: number = -1, offset: number = 0): Promise<NewsBrief[]> {
    let query = supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching latest briefs:', error);
      throw new Error(`Failed to fetch latest briefs: ${error.message}`);
    }
    
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async getBriefsByStatus(status: string): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .eq('status', status)
      .order('published_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching briefs by status:', error);
      throw new Error(`Failed to fetch briefs by status: ${error.message}`);
    }
    
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async getAllBriefs(): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .order('published_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all briefs:', error);
      throw new Error(`Failed to fetch all briefs: ${error.message}`);
    }
    
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async getBriefById(id: string): Promise<NewsBrief | null> {
    const { data, error } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching brief by ID:', error);
      throw new Error(`Failed to fetch brief by ID: ${error.message}`);
    }
    
    return data ? this.transformBriefData(data) : null;
  }

  // Fix existing briefs by populating sourceArticles with actual article URLs
  async fixBriefSourceArticles(): Promise<{ fixed: number; errors: string[] }> {
    console.log('🔧 Starting to fix brief source articles...');
    
    // Get all briefs with empty or missing sourceArticles
    const { data: briefs, error: briefsError } = await supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*')
      .or('source_articles.is.null,source_articles.eq.{}')
      .limit(100); // Limit to avoid timeout
    
    if (briefsError) {
      console.error('Error fetching briefs:', briefsError);
      return { fixed: 0, errors: [`Failed to fetch briefs: ${briefsError.message}`] };
    }
    
    if (!briefs || briefs.length === 0) {
      console.log('✅ No briefs need fixing - all have source articles');
      return { fixed: 0, errors: [] };
    }
    
    console.log(`🔍 Found ${briefs.length} briefs with missing source articles`);
    
    let fixedCount = 0;
    const errors: string[] = [];
    
    for (const brief of briefs) {
      try {
        // Find articles that match this brief's category and were published around the same time
        const briefDate = new Date(brief.published_at);
        const startDate = new Date(briefDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
        const endDate = new Date(briefDate.getTime() + 24 * 60 * 60 * 1000);   // 24 hours after
        
        const { data: articles, error: articlesError } = await supabase
          .from(TABLES.NEWS_ARTICLES)
          .select('url, title, published_at')
          .eq('category', brief.category)
          .gte('published_at', startDate.toISOString())
          .lte('published_at', endDate.toISOString())
          .order('published_at', { ascending: false })
          .limit(3); // Get up to 3 most relevant articles
        
        if (articlesError) {
          console.error(`Error fetching articles for brief ${brief.id}:`, articlesError);
          errors.push(`Failed to fetch articles for brief ${brief.id}: ${articlesError.message}`);
          continue;
        }
        
        if (articles && articles.length > 0) {
          // Update the brief with the actual article URLs
          const articleUrls = articles.map(article => article.url);
          
          const { error: updateError } = await supabase
            .from(TABLES.NEWS_BRIEFS)
            .update({
              source_articles: articleUrls,
              updated_at: new Date().toISOString()
            })
            .eq('id', brief.id);
          
          if (updateError) {
            console.error(`Error updating brief ${brief.id}:`, updateError);
            errors.push(`Failed to update brief ${brief.id}: ${updateError.message}`);
          } else {
            console.log(`✅ Fixed brief ${brief.id} with ${articleUrls.length} source URLs`);
            fixedCount++;
          }
        } else {
          console.log(`⚠️ No matching articles found for brief ${brief.id}`);
          errors.push(`No matching articles found for brief ${brief.id}`);
        }
      } catch (error) {
        console.error(`Error processing brief ${brief.id}:`, error);
        errors.push(`Error processing brief ${brief.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} out of ${briefs.length} briefs`);
    return { fixed: fixedCount, errors };
  }

  async getBriefsCount(timeRange: number = -1): Promise<number> {
    let query = supabase
      .from(TABLES.NEWS_BRIEFS)
      .select('*', { count: 'exact', head: true });
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { count, error } = await query;
    
    if (error) {
      console.error('Error fetching briefs count:', error);
      throw new Error(`Failed to fetch briefs count: ${error.message}`);
    }
    
    return count || 0;
  }

  // Transform database snake_case to TypeScript camelCase
  private transformBriefData(brief: any): NewsBrief {
    if (!brief) return brief as NewsBrief;
    
    return {
      id: brief.id,
      title: brief.title,
      summary: brief.summary,
      sourceArticles: brief.source_articles || [],
      category: brief.category,
      publishedAt: brief.published_at ? new Date(brief.published_at) : new Date(),
      tags: brief.tags || [],
      status: brief.status || 'published',
      llmMetadata: brief.llm_metadata || {},
      createdAt: brief.created_at ? new Date(brief.created_at) : new Date(),
      updatedAt: brief.updated_at ? new Date(brief.updated_at) : new Date(),
    };
  }

  // Transform database snake_case to TypeScript camelCase with resolved source URLs
  public async transformBriefDataWithResolvedSources(brief: any): Promise<NewsBrief> {
    if (!brief) return brief as NewsBrief;
    
    // For now, just return the original source articles
    // The frontend will handle parsing them into readable source names
    return {
      id: brief.id,
      title: brief.title,
      summary: brief.summary,
      sourceArticles: brief.sourceArticles || brief.source_articles || [],
      category: brief.category,
      publishedAt: brief.publishedAt ? new Date(brief.publishedAt) : (brief.published_at ? new Date(brief.published_at) : new Date()),
      tags: brief.tags || [],
      status: brief.status || 'published',
      llmMetadata: brief.llmMetadata || brief.llm_metadata || {},
      createdAt: brief.createdAt ? new Date(brief.createdAt) : (brief.created_at ? new Date(brief.created_at) : new Date()),
      updatedAt: brief.updatedAt ? new Date(brief.updatedAt) : (brief.updated_at ? new Date(brief.updated_at) : new Date()),
    };
  }

  // Calculate date range based on time range selection
  private calculateDateRange(timeRange: number): Date | null {
    if (timeRange === -1) return null; // Unlimited
    
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (timeRange * 24 * 60 * 60 * 1000));
    return cutoffDate;
  }

  // Get articles with time filtering
  async getArticlesWithTimeFilter(timeRange: number = -1, limit: number = 100): Promise<NewsArticle[]> {
    let query = supabase
      .from(TABLES.NEWS_ARTICLES)
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    
    // Apply time filtering if specified
    const cutoffDate = this.calculateDateRange(timeRange);
    if (cutoffDate) {
      query = query.gte('published_at', cutoffDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching articles with time filter:', error);
      throw new Error(`Failed to fetch articles with time filter: ${error.message}`);
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

  /**
   * Get articles within a specific date range
   */
  async getArticlesByDateRange(startDate: Date, endDate: Date): Promise<NewsArticle[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.NEWS_ARTICLES)
        .select('*')
        .gte('published_at', startDate.toISOString())
        .lte('published_at', endDate.toISOString())
        .order('published_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching articles by date range:', error);
        throw new Error(`Failed to fetch articles by date range: ${error.message}`);
      }
      
      console.log(`📰 Retrieved ${data?.length || 0} articles from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      return data || [];
    } catch (error) {
      console.error('Exception fetching articles by date range:', error);
      return [];
    }
  }

  /**
   * Check if an article already exists in the database
   */
  async articleExists(url: string, title: string): Promise<boolean> {
    try {
      // Check by URL first (most reliable)
      const { data: urlMatch, error: urlError } = await supabase
        .from(TABLES.NEWS_ARTICLES)
        .select('id')
        .eq('url', url)
        .maybeSingle();
      
      if (urlError) {
        console.error('Error checking article existence by URL:', urlError);
      } else if (urlMatch) {
        return true; // Article exists with this URL
      }
      
      // Check by title similarity if URL doesn't match
      if (title) {
        const { data: titleMatches, error: titleError } = await supabase
          .from(TABLES.NEWS_ARTICLES)
          .select('id, title')
          .ilike('title', `%${title}%`)
          .limit(5);
        
        if (titleError) {
          console.error('Error checking article existence by title:', titleError);
        } else if (titleMatches && titleMatches.length > 0) {
          // Check if any title is very similar (80%+ similarity)
          const similarity = this.calculateTitleSimilarity(title, titleMatches[0].title);
          if (similarity > 0.8) {
            return true; // Article with similar title exists
          }
        }
      }
      
      return false; // Article doesn't exist
    } catch (error) {
      console.error('Exception checking article existence:', error);
      return false; // Assume it doesn't exist if we can't check
    }
  }

  /**
   * Calculate title similarity using simple word overlap
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.toLowerCase().split(/\s+/));
    const words2 = new Set(title2.toLowerCase().split(/\s+/));
    
    return words1.size > 0 && words2.size > 0 ? 
      words1.size / words2.size : 0;
  }

  // Brief Management Methods
  async updateBrief(id: string, updatedBrief: NewsBrief): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.NEWS_BRIEFS)
        .update({
          title: updatedBrief.title,
          summary: updatedBrief.summary,
          tags: updatedBrief.tags,
          status: updatedBrief.status,
          updated_at: updatedBrief.updatedAt.toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating brief:', error);
        throw new Error(`Failed to update brief: ${error.message}`);
      }
      
      console.log(`✅ Updated brief ${id}`);
    } catch (error) {
      console.error('Exception updating brief:', error);
      throw error;
    }
  }

  async deleteBrief(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.NEWS_BRIEFS)
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting brief:', error);
        throw new Error(`Failed to delete brief: ${error.message}`);
      }
      
      console.log(`🗑️ Deleted brief ${id}`);
    } catch (error) {
      console.error('Exception deleting brief:', error);
      throw error;
    }
  }

  async logBriefEdit(editLog: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('brief_edit_logs')
        .insert({
          brief_id: editLog.briefId,
          action: editLog.action,
          editor_id: editLog.editorId,
          previous_content: editLog.previousContent,
          new_content: editLog.newContent,
          edit_notes: editLog.editNotes,
          metadata: editLog.metadata || {}
        });
      
      if (error) {
        console.error('Error logging brief edit:', error);
        throw new Error(`Failed to log brief edit: ${error.message}`);
      }
      
      console.log('📝 Brief edit logged successfully:', {
        briefId: editLog.briefId,
        action: editLog.action,
        editorId: editLog.editorId
      });
    } catch (error) {
      console.error('Error logging brief edit:', error);
      // Don't throw error for logging failures - just log them
    }
  }

  async getBriefEditLogs(briefId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('brief_edit_logs')
        .select('*')
        .eq('brief_id', briefId)
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error fetching brief edit logs:', error);
        throw new Error(`Failed to fetch brief edit logs: ${error.message}`);
      }
      
      return (data || []).map(log => ({
        id: log.id,
        briefId: log.brief_id,
        action: log.action,
        editorId: log.editor_id,
        previousContent: log.previous_content,
        newContent: log.new_content,
        editNotes: log.edit_notes,
        timestamp: log.timestamp,
        metadata: log.metadata || {}
      }));
    } catch (error) {
      console.error('Exception fetching brief edit logs:', error);
      return [];
    }
  }

  async getAllBriefEditLogs(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('brief_edit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error fetching all edit logs:', error);
        throw new Error(`Failed to fetch all edit logs: ${error.message}`);
      }
      
      return (data || []).map(log => ({
        id: log.id,
        briefId: log.brief_id,
        action: log.action,
        editorId: log.editor_id,
        previousContent: log.previous_content,
        newContent: log.new_content,
        editNotes: log.edit_notes,
        timestamp: log.timestamp,
        metadata: log.metadata || {}
      }));
    } catch (error) {
      console.error('Exception fetching all edit logs:', error);
      return [];
    }
  }
}
