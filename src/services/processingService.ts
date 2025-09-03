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
      console.log('⚠️ Processing already in progress, returning current status');
      return {
        success: false,
        articlesProcessed: 0,
        briefsGenerated: 0,
        errors: ['Processing already in progress'],
        timestamp: new Date(),
        llmTokensUsed: 0,
        llmCostUsd: 0,
        modelVersion: 'gpt-4o-mini',
        promptVersion: 'fact-check-v1.0'
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      console.log('🚀 Starting RSS feed processing...');
      
      // Fetch all RSS feeds with better error handling
      let feedResponses: Map<string, any>;
      try {
        feedResponses = await this.rssService.fetchAllFeeds();
      } catch (fetchError) {
        console.error('❌ Failed to fetch RSS feeds:', fetchError);
        feedResponses = new Map(); // Empty map to continue processing
        errors.push(`RSS fetch error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
      
      if (feedResponses.size === 0) {
        console.log('⚠️ No RSS feeds were successfully fetched');
        return {
          success: false,
          articlesProcessed: 0,
          briefsGenerated: 0,
          errors: ['No RSS feeds were successfully fetched'],
          timestamp: new Date(),
          llmTokensUsed: 0,
          llmCostUsd: 0,
          modelVersion: 'gpt-4o-mini',
          promptVersion: 'fact-check-v1.0'
        };
      }
      
      // Convert RSS items to news articles
      const allArticles: NewsArticle[] = [];
      const failedFeeds: string[] = [];
      
      for (const [feedId, response] of feedResponses) {
        try {
          // Get the feed to access its category
          const feed = await this.databaseService.getFeed(feedId);
          if (!feed) {
            console.warn(`⚠️ Feed ${feedId} not found in database, skipping`);
            continue;
          }
          
          const category = feed.category || 'US_NATIONAL';
          
          const articles = this.rssService.convertToNewsArticles(
            feedId, 
            response, 
            category
          );
          
          if (articles.length > 0) {
            allArticles.push(...articles);
            console.log(`📰 Processed ${articles.length} articles from ${feed.name}`);
          } else {
            console.log(`ℹ️ No articles found in ${feed.name}`);
          }
          
        } catch (error) {
          const errorMsg = `Failed to process feed ${feedId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedFeeds.push(feedId);
        }
      }
      
      console.log(`📊 Processing Summary: ${allArticles.length} articles from ${feedResponses.size - failedFeeds.length} feeds, ${failedFeeds.length} feeds failed`);
      
      // Save articles to database
      let savedArticlesCount = 0;
      if (allArticles.length > 0) {
        try {
          await this.databaseService.saveArticles(allArticles);
          savedArticlesCount = allArticles.length;
          console.log('✅ Articles saved to database');
        } catch (error) {
          const errorMsg = `Failed to save articles: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      // Generate news briefs using enhanced AI service
      const briefs: any[] = [];
      let totalTokensUsed = 0;
      let totalCostUsd = 0;
      
      if (savedArticlesCount > 0) {
        console.log('🤖 Generating AI briefs...');
        
        for (const article of allArticles) {
          try {
            const aiResult = await this.aiService.generateBrief([article]);
            if (aiResult && aiResult.brief) {
              briefs.push(aiResult.brief);
              totalTokensUsed += aiResult.tokensUsed || 0;
              totalCostUsd += aiResult.costUsd || 0;
            } else {
              console.warn(`⚠️ AI brief generation returned empty result for article ${article.id}`);
              // Create a basic brief manually
              const basicBrief = {
                id: `brief-${article.id}`,
                title: article.title || 'Untitled',
                summary: article.description || article.content?.substring(0, 300) || 'Content unavailable',
                sourceArticles: [article.url],
                category: article.category || 'US_NATIONAL',
                publishedAt: new Date(),
                tags: [],
                status: 'published',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              briefs.push(basicBrief);
            }
          } catch (error) {
            console.error(`❌ Failed to generate AI brief for article ${article.id}:`, error);
            errors.push(`AI brief generation failed for ${article.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Fallback to basic brief generation
            try {
              const basicBriefs = this.briefService.generateBriefs([article]);
              briefs.push(...basicBriefs);
            } catch (fallbackError) {
              console.error(`❌ Fallback brief generation also failed for article ${article.id}:`, fallbackError);
              errors.push(`Fallback brief generation failed for ${article.id}: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
              
              // Create a minimal brief to prevent complete failure
              const minimalBrief = {
                id: `minimal-${article.id}`,
                title: article.title || 'Untitled',
                summary: article.description || 'Content processing failed',
                sourceArticles: [article.url],
                category: article.category || 'US_NATIONAL',
                publishedAt: new Date(),
                tags: [],
                status: 'published',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              briefs.push(minimalBrief);
            }
          }
        }
        
        console.log(`✅ Generated ${briefs.length} briefs (${briefs.length - allArticles.length} using AI)`);
        
        // Save briefs to database
        if (briefs.length > 0) {
          try {
            await this.databaseService.saveBriefs(briefs);
            console.log('✅ Briefs saved to database');
          } catch (error) {
            const errorMsg = `Failed to save briefs: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: errors.length === 0,
        articlesProcessed: savedArticlesCount,
        briefsGenerated: briefs.length,
        errors,
        timestamp: new Date(),
        llmTokensUsed: totalTokensUsed,
        llmCostUsd: totalCostUsd,
        modelVersion: 'gpt-4o-mini',
        promptVersion: 'fact-check-v1.0'
      };
      
      // Save processing log to database
      try {
        await this.databaseService.saveProcessingLog(result, processingTime);
      } catch (error) {
        console.error('Failed to save processing log:', error);
      }
      
      console.log(`🎯 Processing completed in ${processingTime}ms`);
      console.log(`📊 Final Results: ${result.articlesProcessed} articles, ${result.briefsGenerated} briefs`);
      if (errors.length > 0) {
        console.log(`⚠️ Errors encountered: ${errors.length}`);
        errors.forEach(error => console.log(`   - ${error}`));
      }
      
      return result;
      
    } catch (error) {
      const errorMsg = `Critical error during RSS processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`💥 ${errorMsg}`);
      errors.push(errorMsg);
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: false,
        articlesProcessed: 0,
        briefsGenerated: 0,
        errors,
        timestamp: new Date(),
        llmTokensUsed: 0,
        llmCostUsd: 0,
        modelVersion: 'gpt-4o-mini',
        promptVersion: 'fact-check-v1.0'
      };
      
      // Save processing log to database
      try {
        await this.databaseService.saveProcessingLog(result, processingTime);
      } catch (logError) {
        console.error('Failed to save error processing log:', logError);
      }
      
      return result;
      
    } finally {
      this.isProcessing = false;
    }
  }

  async processSingleFeed(feedId: string): Promise<ProcessingResult> {
    // Set up process-level error handler for this specific operation
    const originalUnhandledRejection = process.listeners('unhandledRejection');
    const originalUncaughtException = process.listeners('uncaughtException');
    
    const cleanup = () => {
      // Restore original handlers
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
      originalUnhandledRejection.forEach(listener => process.on('unhandledRejection', listener));
      originalUncaughtException.forEach(listener => process.on('uncaughtException', listener));
    };
    
    try {
      const startTime = Date.now();
      const errors: string[] = [];
      
      // Default result in case of complete failure
      const defaultResult: ProcessingResult = {
        success: false,
        articlesProcessed: 0,
        briefsGenerated: 0,
        errors: ['Processing failed due to unexpected error'],
        timestamp: new Date(),
        llmTokensUsed: 0,
        llmCostUsd: 0,
        modelVersion: 'gpt-4o-mini',
        promptVersion: 'fact-check-v1.0'
      };
      
      try {
        console.log(`🔄 Processing single feed: ${feedId}`);
        
        const feed = await this.databaseService.getFeed(feedId);
        if (!feed) {
          const errorMsg = `Feed not found: ${feedId}`;
          errors.push(errorMsg);
          return {
            ...defaultResult,
            errors: [errorMsg]
          };
        }

        console.log(`📰 Processing feed: ${feed.name} (${feed.url})`);
        
        const feedResponse = await this.rssService.fetchFeed(feed);
        if (!feedResponse) {
          const errorMsg = `Failed to fetch feed: ${feed.name}`;
          errors.push(errorMsg);
          return {
            ...defaultResult,
            errors: [errorMsg]
          };
        }
        
        console.log(`📄 Converting ${feedResponse.items.length} RSS items to articles...`);
        const articles = this.rssService.convertToNewsArticles(
          feedId, 
          feedResponse, 
          feed.category
        );
        
        console.log(`💾 Saving ${articles.length} articles to database...`);
        // Save articles to database
        if (articles.length > 0) {
          try {
            await this.databaseService.saveArticles(articles);
            console.log(`✅ Successfully saved ${articles.length} articles`);
          } catch (saveError) {
            console.error(`❌ Failed to save articles:`, saveError);
            const errorMsg = `Database save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
            errors.push(errorMsg);
            return {
              ...defaultResult,
              articlesProcessed: articles.length,
              errors: [errorMsg]
            };
          }
        }
        
        // Generate news briefs using enhanced AI service
        const briefs: any[] = [];
        let totalTokensUsed = 0;
        let totalCostUsd = 0;
        
        if (articles.length > 0) {
          console.log(`🤖 Generating AI briefs for ${articles.length} articles...`);
          
          let consecutiveFailures = 0;
          const maxConsecutiveFailures = 5; // Circuit breaker threshold
          
          for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`🤖 Processing article ${i + 1}/${articles.length}: ${article.title.substring(0, 50)}...`);
            
            try {
              console.log(`🤖 Starting AI processing for article: ${article.id}`);
              
              // Add timeout to prevent hanging
              const aiProcessingPromise = this.aiService.generateBrief([article]);
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('AI processing timeout after 60 seconds')), 60000);
              });
              
              const aiResult = await Promise.race([aiProcessingPromise, timeoutPromise]);
              briefs.push(aiResult.brief);
              totalTokensUsed += aiResult.tokensUsed;
              totalCostUsd += aiResult.costUsd;
              console.log(`✅ AI brief generated for article: ${article.id}`);
              
              // Reset consecutive failures on success
              consecutiveFailures = 0;
              
            } catch (error) {
              consecutiveFailures++;
              console.error(`❌ Failed to generate AI brief for article ${article.id} (failure ${consecutiveFailures}/${maxConsecutiveFailures}):`, error);
              
              // Check circuit breaker
              if (consecutiveFailures >= maxConsecutiveFailures) {
                console.error(`🚫 Circuit breaker triggered after ${consecutiveFailures} consecutive failures. Skipping remaining articles.`);
                const errorMsg = `Circuit breaker triggered: Too many consecutive AI processing failures`;
                errors.push(errorMsg);
                break;
              }
              
              // Log detailed error information
              if (error instanceof Error) {
                console.error('Error details:', {
                  message: error.message,
                  stack: error.stack,
                  name: error.name
                });
              }
              
              // Fallback to basic brief generation
              try {
                console.log(`🔄 Attempting fallback brief generation for article: ${article.id}`);
                const basicBriefs = this.briefService.generateBriefs([article]);
                briefs.push(...basicBriefs);
                console.log(`✅ Fallback briefs generated for article: ${article.id}`);
              } catch (fallbackError) {
                console.error(`💥 Fallback brief generation also failed for article ${article.id}:`, fallbackError);
                
                // Create a minimal brief to prevent complete failure
                try {
                  const minimalBrief = {
                    id: `fallback-${article.id}-${Date.now()}`,
                    title: article.title,
                    summary: `Brief summary of: ${article.title}`,
                    sourceArticles: [article.url],
                    category: article.category,
                    publishedAt: new Date(),
                    tags: article.tags || [],
                    status: 'published',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };
                  briefs.push(minimalBrief);
                  console.log(`🆘 Created minimal fallback brief for article: ${article.id}`);
                } catch (minimalError) {
                  console.error(`💀 Even minimal brief creation failed for article ${article.id}:`, minimalError);
                  // Continue with next article instead of failing completely
                }
              }
            }
          }
          
          console.log(`✅ Generated ${briefs.length} briefs (${briefs.length - articles.length} using fallbacks)`);
          
          // Save briefs to database
          if (briefs.length > 0) {
            try {
              console.log(`💾 Saving ${briefs.length} briefs to database...`);
              await this.databaseService.saveBriefs(briefs);
              console.log(`✅ Successfully saved ${briefs.length} briefs`);
            } catch (saveError) {
              console.error(`❌ Failed to save briefs:`, saveError);
              
              // Log detailed error information
              if (saveError instanceof Error) {
                console.error('Save error details:', {
                  message: saveError.message,
                  stack: saveError.stack,
                  name: saveError.name
                });
              }
              
              const errorMsg = `Brief save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
              errors.push(errorMsg);
              return {
                ...defaultResult,
                articlesProcessed: articles.length,
                briefsGenerated: briefs.length,
                errors: [errorMsg]
              };
            }
          }
        }
        
        const processingTime = Date.now() - startTime;
        
        const result: ProcessingResult = {
          success: errors.length === 0,
          articlesProcessed: articles.length,
          briefsGenerated: briefs.length,
          errors,
          timestamp: new Date(),
          llmTokensUsed: totalTokensUsed,
          llmCostUsd: totalCostUsd,
          modelVersion: 'gpt-4o-mini',
          promptVersion: 'fact-check-v1.0'
        };
        
        console.log(`🎯 Single feed processing completed in ${processingTime}ms`);
        return result;
        
      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`💥 Error processing feed ${feedId}:`, error);
        
        // Add the error to the errors array
        if (error instanceof Error) {
          errors.push(error.message);
        } else {
          errors.push('Unknown error occurred');
        }
        
        return {
          ...defaultResult,
          errors,
          timestamp: new Date()
        };
      }
    } finally {
      cleanup();
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
