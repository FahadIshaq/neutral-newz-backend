import * as cron from 'node-cron';
import { RSSService } from './rssService';
import { DatabaseService } from './databaseService';
import { BriefService } from './briefService';
import { AIService } from './aiService';
import { PROCESSING_INTERVAL } from '../utils/constants';
import { RSSFeed, NewsArticle, NewsBrief, ProcessingResult } from '../types';

export class ProcessingService {
  private isProcessing = false;
  private rssService: RSSService;
  private databaseService: DatabaseService;
  private briefService: BriefService;
  private aiService: AIService;

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
  }

  startScheduledProcessing(): void {
    console.log(`Starting scheduled RSS processing every 30 minutes`);
    
    cron.schedule(PROCESSING_INTERVAL, async () => {
      if (!this.isProcessing) {
        await this.processAllFeeds();
      } else {
        console.log('Skipping scheduled run - already processing');
      }
    });
  }

  async processAllFeeds(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Processing already in progress');
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      console.log('Starting RSS feed processing...');
      
      // Fetch all RSS feeds
      const feedResponses = await this.rssService.fetchAllFeeds();
      
      // Convert RSS items to news articles
      const allArticles: NewsArticle[] = [];
      for (const [feedId, response] of feedResponses) {
        // Get the feed to access its category
        const feed = await this.databaseService.getFeed(feedId);
        const category = feed?.category || 'US_NATIONAL';
        
        const articles = this.rssService.convertToNewsArticles(
          feedId, 
          response, 
          category
        );
        allArticles.push(...articles);
      }
      
      console.log(`Processed ${allArticles.length} articles from RSS feeds`);
      
      // Save articles to database
      if (allArticles.length > 0) {
        await this.databaseService.saveArticles(allArticles);
        console.log('Articles saved to database');
      }
      
      // Generate news briefs using enhanced AI service
      const briefs: any[] = [];
      let totalTokensUsed = 0;
      let totalCostUsd = 0;
      
      for (const article of allArticles) {
        try {
          const aiResult = await this.aiService.generateBrief([article]);
          briefs.push(aiResult.brief);
          totalTokensUsed += aiResult.tokensUsed;
          totalCostUsd += aiResult.costUsd;
        } catch (error) {
          console.error(`Failed to generate AI brief for article ${article.id}:`, error);
          // Fallback to basic brief generation
          const basicBriefs = this.briefService.generateBriefs([article]);
          briefs.push(...basicBriefs);
        }
      }
      
      console.log(`Generated ${briefs.length} news briefs (${briefs.length - allArticles.length} using AI)`);
      
      // Save briefs to database
      if (briefs.length > 0) {
        await this.databaseService.saveBriefs(briefs);
        console.log('Briefs saved to database');
      }
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: true,
        articlesProcessed: allArticles.length,
        briefsGenerated: briefs.length,
        errors: [],
        timestamp: new Date(),
        llmTokensUsed: totalTokensUsed,
        llmCostUsd: totalCostUsd,
        modelVersion: 'gpt-4o-mini',
        promptVersion: 'fact-check-v1.0'
      };
      
      // Save processing log to database
      await this.databaseService.saveProcessingLog(result, processingTime);
      
      console.log(`Processing completed in ${processingTime}ms`);
      console.log(`Articles processed: ${result.articlesProcessed}`);
      console.log(`Briefs generated: ${result.briefsGenerated}`);
      
      return result;
      
    } catch (error) {
      console.error('Error during RSS processing:', error);
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: false,
        articlesProcessed: 0,
        briefsGenerated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date(),
        llmTokensUsed: 0,
        llmCostUsd: 0,
        modelVersion: 'gpt-4o',
        promptVersion: 'bias-strip-v2.1'
      };
      
      // Save error log to database
      await this.databaseService.saveProcessingLog(result, processingTime);
      
      return result;
      
    } finally {
      this.isProcessing = false;
    }
  }

  async processSingleFeed(feedId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const feed = await this.databaseService.getFeed(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    try {
      console.log(`Processing single feed: ${feed.name}`);
      
      const feedResponse = await this.rssService.fetchFeed(feed);
      if (!feedResponse) {
        throw new Error(`Failed to fetch feed: ${feed.name}`);
      }
      
      const articles = this.rssService.convertToNewsArticles(
        feedId, 
        feedResponse, 
        feed.category
      );
      
      // Save articles to database
      if (articles.length > 0) {
        await this.databaseService.saveArticles(articles);
      }
      
      // Generate news briefs using enhanced AI service
      const briefs: any[] = [];
      let totalTokensUsed = 0;
      let totalCostUsd = 0;
      
      for (const article of articles) {
        try {
          const aiResult = await this.aiService.generateBrief([article]);
          briefs.push(aiResult.brief);
          totalTokensUsed += aiResult.tokensUsed;
          totalCostUsd += aiResult.costUsd;
        } catch (error) {
          console.error(`Failed to generate AI brief for article ${article.id}:`, error);
          // Fallback to basic brief generation
          const basicBriefs = this.briefService.generateBriefs([article]);
          briefs.push(...basicBriefs);
        }
      }
      
      // Save briefs to database
      if (briefs.length > 0) {
        await this.databaseService.saveBriefs(briefs);
      }
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: true,
        articlesProcessed: articles.length,
        briefsGenerated: briefs.length,
        errors: [],
        timestamp: new Date(),
        llmTokensUsed: totalTokensUsed,
        llmCostUsd: totalCostUsd,
        modelVersion: 'gpt-4o-mini',
        promptVersion: 'fact-check-v1.0'
      };
      
      return result;
      
    } catch (error) {
      console.error(`Error processing feed ${feedId}:`, error);
      
      return {
        success: false,
        articlesProcessed: 0,
        briefsGenerated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date(),
        llmTokensUsed: 0,
        llmCostUsd: 0,
        modelVersion: 'gpt-4o',
        promptVersion: 'bias-strip-v2.1'
      };
    }
  }

  getProcessingStatus(): { isProcessing: boolean; lastRun?: Date } {
    return {
      isProcessing: this.isProcessing
    };
  }

  stopScheduledProcessing(): void {
    console.log('Stopping scheduled RSS processing');
    // Note: cron.schedule returns a CronJob object that can be stopped
    // For now, we'll just log the action
  }
}
