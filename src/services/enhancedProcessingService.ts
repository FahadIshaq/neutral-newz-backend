import * as cron from 'node-cron';
import { RSSService } from './rssService';
import { DatabaseService } from './databaseService';
import { BriefService } from './briefService';
import { AIService } from './aiService';
import { DeduplicationService } from './deduplicationService';
import { 
  PROCESSING_INTERVAL, 
  PROCESSING_BATCH_INTERVAL, 
  HOLDING_QUEUE_DURATION,
  DAILY_ARTICLE_LIMIT,
  MAX_ARTICLES_PER_CATEGORY
} from '../utils/constants';
import { RSSFeed, NewsArticle, NewsBrief, ProcessingResult } from '../types';

interface ProcessingQueue {
  articles: NewsArticle[];
  lastProcessed: Date;
  isProcessing: boolean;
}

export class EnhancedProcessingService {
  private isProcessing = false;
  private rssService: RSSService;
  private databaseService: DatabaseService;
  private briefService: BriefService;
  private aiService: AIService;
  private deduplicationService: DeduplicationService;
  
  // Processing queue for intelligent batching
  private processingQueue: ProcessingQueue = {
    articles: [],
    lastProcessed: new Date(),
    isProcessing: false
  };

  constructor(
    rssService: RSSService,
    databaseService: DatabaseService,
    briefService: BriefService,
    aiService: AIService
  ) {
    this.rssService = rssService;
    this.databaseService = databaseService;
    this.briefService = briefService;
    this.aiService = aiService;
    this.deduplicationService = new DeduplicationService();
  }

  /**
   * Start the enhanced processing service with 30-second checking
   */
  startEnhancedProcessing(): void {
    console.log('🚀 Starting Enhanced Processing Service');
    console.log(`⏰ RSS checking every 30 seconds`);
    console.log(`📦 Processing batches every 30 minutes`);
    console.log(`🎯 Daily limit: ${DAILY_ARTICLE_LIMIT} articles`);
    console.log(`📊 Max per category: ${MAX_ARTICLES_PER_CATEGORY} articles`);
    
    // Schedule RSS checking every 30 seconds
    cron.schedule(PROCESSING_INTERVAL, async () => {
      await this.checkAndQueueRSSFeeds();
    });
    
    // Schedule actual processing every 30 minutes
    cron.schedule(PROCESSING_BATCH_INTERVAL, async () => {
      await this.processQueuedArticles();
    });
    
    // Initial RSS check
    setTimeout(() => {
      this.checkAndQueueRSSFeeds();
    }, 5000); // Start after 5 seconds
  }

  /**
   * Check RSS feeds and queue articles for processing
   */
  private async checkAndQueueRSSFeeds(): Promise<void> {
    try {
      console.log('🔍 Checking RSS feeds for new articles...');
      
      // Fetch RSS feeds
      const feedResponses = await this.rssService.fetchAllFeeds();
      if (feedResponses.size === 0) {
        console.log('ℹ️ No RSS feeds responded, skipping this check');
        return;
      }
      
      // Convert to articles
      const newArticles: NewsArticle[] = [];
      for (const [feedId, response] of feedResponses) {
        try {
          const feed = await this.databaseService.getFeed(feedId);
          if (!feed) continue;
          
          const category = feed.category || 'US_NATIONAL';
          const articles = this.rssService.convertToNewsArticles(feedId, response, category);
          
          // Check if articles are already in database
          const uniqueArticles = await this.filterNewArticles(articles);
          newArticles.push(...uniqueArticles);
          
          if (uniqueArticles.length > 0) {
            console.log(`📰 Found ${uniqueArticles.length} new articles from ${feed.name}`);
          }
        } catch (error) {
          console.error(`❌ Error processing feed ${feedId}:`, error);
        }
      }
      
      if (newArticles.length > 0) {
        // Add to processing queue
        this.processingQueue.articles.push(...newArticles);
        console.log(`📦 Queued ${newArticles.length} new articles for processing`);
        console.log(`📊 Total queued: ${this.processingQueue.articles.length} articles`);
        
        // Check if we should process immediately (breaking news)
        const hasBreakingNews = this.detectBreakingNews(newArticles);
        if (hasBreakingNews) {
          console.log('🚨 Breaking news detected, processing immediately');
          await this.processQueuedArticles();
        }
      }
      
    } catch (error) {
      console.error('❌ Error in RSS check:', error);
    }
  }

  /**
   * Process queued articles with intelligent deduplication
   */
  private async processQueuedArticles(): Promise<void> {
    if (this.processingQueue.isProcessing || this.processingQueue.articles.length === 0) {
      return;
    }
    
    this.processingQueue.isProcessing = true;
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing ${this.processingQueue.articles.length} queued articles...`);
      
      // Get existing articles for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingArticles = await this.databaseService.getArticlesByDateRange(today, new Date());
      
      // Deduplicate and distribute articles
      const dedupResult = await this.deduplicationService.deduplicateAndDistribute(
        this.processingQueue.articles,
        existingArticles
      );
      
      console.log(`✅ Deduplication complete: ${dedupResult.uniqueArticles.length} unique articles selected`);
      
      if (dedupResult.uniqueArticles.length === 0) {
        console.log('ℹ️ No unique articles to process after deduplication');
        this.processingQueue.articles = [];
        return;
      }
      
      // Save unique articles to database
      await this.databaseService.saveArticles(dedupResult.uniqueArticles);
      console.log(`💾 Saved ${dedupResult.uniqueArticles.length} articles to database`);
      
      // Generate AI briefs
      const briefs = await this.generateBriefsForArticles(dedupResult.uniqueArticles);
      console.log(`🤖 Generated ${briefs.length} AI briefs`);
      
      // Save briefs to database
      if (briefs.length > 0) {
        await this.databaseService.saveBriefs(briefs);
        console.log(`💾 Saved ${briefs.length} briefs to database`);
      }
      
      // Clear the queue
      this.processingQueue.articles = [];
      this.processingQueue.lastProcessed = new Date();
      
      // Log processing summary
      const processingTime = Date.now() - startTime;
      console.log(`🎉 Processing complete in ${processingTime}ms`);
      console.log(`📊 Summary: ${dedupResult.uniqueArticles.length} articles, ${briefs.length} briefs`);
      
      // Log distribution stats
      console.log(`📈 Distribution: ${JSON.stringify(dedupResult.distributionStats.byCategory)}`);
      
    } catch (error) {
      console.error('❌ Error processing queued articles:', error);
    } finally {
      this.processingQueue.isProcessing = false;
    }
  }

  /**
   * Filter out articles that already exist in the database
   */
  private async filterNewArticles(articles: NewsArticle[]): Promise<NewsArticle[]> {
    const newArticles: NewsArticle[] = [];
    
    for (const article of articles) {
      try {
        // Check if article already exists by URL or title
        const exists = await this.databaseService.articleExists(article.url, article.title);
        if (!exists) {
          newArticles.push(article);
        }
      } catch (error) {
        console.error(`❌ Error checking article existence:`, error);
        // If we can't check, assume it's new
        newArticles.push(article);
      }
    }
    
    return newArticles;
  }

  /**
   * Detect breaking news that should be processed immediately
   */
  private detectBreakingNews(articles: NewsArticle[]): boolean {
    const breakingKeywords = [
      'breaking', 'urgent', 'alert', 'crisis', 'emergency', 'attack', 'disaster',
      'election', 'resignation', 'impeachment', 'war', 'conflict', 'coup',
      'market crash', 'economic crisis', 'natural disaster'
    ];
    
    return articles.some(article => {
      const title = article.title?.toLowerCase() || '';
      const content = article.content?.toLowerCase() || '';
      const text = `${title} ${content}`;
      
      return breakingKeywords.some(keyword => text.includes(keyword));
    });
  }

  /**
   * Generate AI briefs for articles
   */
  private async generateBriefsForArticles(articles: NewsArticle[]): Promise<NewsBrief[]> {
    const briefs: NewsBrief[] = [];
    
    for (const article of articles) {
      try {
        console.log(`🤖 Generating brief for: ${article.title}`);
        
        const aiResult = await this.aiService.generateBrief([article]);
        if (aiResult && aiResult.brief) {
          briefs.push(aiResult.brief);
          console.log(`✅ Brief generated: ${aiResult.brief.title}`);
        } else {
          console.warn(`⚠️ AI brief generation failed for article ${article.id}`);
          
          // Create fallback brief
          const fallbackBrief = this.createFallbackBrief(article);
          briefs.push(fallbackBrief);
        }
      } catch (error) {
        console.error(`❌ Error generating brief for article ${article.id}:`, error);
        
        // Create fallback brief
        const fallbackBrief = this.createFallbackBrief(article);
        briefs.push(fallbackBrief);
      }
    }
    
    return briefs;
  }

  /**
   * Create a fallback brief when AI generation fails
   */
  private createFallbackBrief(article: NewsArticle): NewsBrief {
    return {
      id: `fallback-${article.id}`,
      title: article.title || 'News Update',
      summary: article.description || article.content?.substring(0, 400) || 'Content unavailable',
      sourceArticles: [article.id],
      category: article.category || 'US_NATIONAL',
      publishedAt: new Date(),
      tags: article.tags || [],
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
      llmMetadata: {
        modelVersion: 'fallback',
        promptVersion: 'fallback-v1.0',
        tokensUsed: 0,
        costUsd: 0,
        processingTimeMs: 0,
        subjectivityScore: 0,
        revisionCount: 0
      }
    };
  }

  /**
   * Get current processing status
   */
  getProcessingStatus(): {
    isProcessing: boolean;
    queueSize: number;
    lastProcessed: Date;
    isChecking: boolean;
  } {
    return {
      isProcessing: this.processingQueue.isProcessing,
      queueSize: this.processingQueue.articles.length,
      lastProcessed: this.processingQueue.lastProcessed,
      isChecking: !this.processingQueue.isProcessing && this.processingQueue.articles.length > 0
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalQueued: number;
    byCategory: Record<string, number>;
    estimatedProcessingTime: number;
  } {
    const byCategory = this.processingQueue.articles.reduce((acc, article) => {
      const category = article.category || 'US_NATIONAL';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Estimate processing time (roughly 2 seconds per article)
    const estimatedProcessingTime = this.processingQueue.articles.length * 2;
    
    return {
      totalQueued: this.processingQueue.articles.length,
      byCategory,
      estimatedProcessingTime
    };
  }

  /**
   * Manually trigger processing (for admin use)
   */
  async manualProcess(): Promise<ProcessingResult> {
    console.log('🔧 Manual processing triggered');
    await this.processQueuedArticles();
    
    return {
      success: true,
      articlesProcessed: 0, // Will be updated by the actual processing
      briefsGenerated: 0,
      errors: [],
      timestamp: new Date(),
      llmTokensUsed: 0,
      llmCostUsd: 0,
      modelVersion: 'gpt-4o-mini',
      promptVersion: 'fact-check-v1.0'
    };
  }

  /**
   * Clear the processing queue (for admin use)
   */
  clearQueue(): void {
    console.log('🧹 Clearing processing queue');
    this.processingQueue.articles = [];
    this.processingQueue.lastProcessed = new Date();
  }

  /**
   * Stop the enhanced processing service
   */
  stopEnhancedProcessing(): void {
    console.log('🛑 Stopping Enhanced Processing Service');
    // The cron jobs will be automatically stopped when the process ends
  }
}
