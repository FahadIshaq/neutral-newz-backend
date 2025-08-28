import axios from 'axios';
import Parser from 'rss-parser';
import { RSSFeed, RSSFeedResponse, RSSItem, NewsArticle } from '../types';
import { MAX_ARTICLES_PER_FEED } from '../utils/constants';
import { DatabaseService } from './databaseService';

export class RSSService {
  private parser: Parser;
  private databaseService: DatabaseService;
  private retryAttempts = 3;
  private retryDelay = 2000; // 2 seconds
  private circuitBreakerThreshold = 5; // Number of consecutive failures before circuit opens
  private circuitBreakerTimeout = 300000; // 5 minutes in milliseconds
  private failedFeeds = new Map<string, { failures: number; lastFailure: number; circuitOpen: boolean }>();

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['content', 'guid']
      },
      timeout: 15000 // Increased timeout
    });
    this.databaseService = new DatabaseService();
  }

  async fetchFeed(feed: RSSFeed): Promise<RSSFeedResponse | null> {
    // Check circuit breaker status
    if (this.isCircuitOpen(feed.id)) {
      console.log(`🚫 Circuit breaker open for ${feed.name}, skipping feed`);
      return null;
    }

    // Validate feed URL before attempting to fetch
    if (!this.isValidUrl(feed.url)) {
      console.error(`❌ Invalid URL for feed ${feed.name}: ${feed.url}`);
      await this.databaseService.updateFeedLastChecked(
        feed.id, 
        new Date(), 
        'Invalid URL format'
      );
      return null;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`Fetching RSS feed: ${feed.name} (${feed.url}) - Attempt ${attempt}/${this.retryAttempts}`);
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await axios.get(feed.url, {
          timeout: 15000, // Increased timeout
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NeutralNews/1.0; RSS Reader)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          },
          validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx status codes
        });

        clearTimeout(timeoutId);

        if (response.status === 403 || response.status === 404) {
          // Don't retry on client errors
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const parsed = await this.parser.parseString(response.data);
        
        // Update feed status in database
        await this.databaseService.updateFeedLastChecked(feed.id, new Date());
        
        // Reset failure count on success
        this.recordSuccess(feed.id);
        
        console.log(`✅ Successfully fetched ${feed.name}: ${parsed.items?.length || 0} items`);
        
        return {
          title: parsed.title || feed.name,
          description: parsed.description || '',
          items: parsed.items?.slice(0, MAX_ARTICLES_PER_FEED).map(item => ({
            title: item.title || '',
            description: item.contentSnippet || item.description || '',
            content: item.content || item.contentSnippet || item.description || '',
            link: item.link || '',
            pubDate: item.pubDate || new Date().toISOString(),
            guid: item.guid || item.link || ''
          })) || []
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Handle specific error types
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new Error('Request timeout');
          } else if ('code' in error && typeof error.code === 'string') {
            if (error.code === 'ECONNREFUSED') {
              lastError = new Error('Connection refused');
            } else if (error.code === 'ENOTFOUND') {
              lastError = new Error('DNS resolution failed');
            }
          }
        }
        
        console.error(`Error fetching RSS feed ${feed.name} (Attempt ${attempt}/${this.retryAttempts}):`, lastError.message);
        
        if (attempt < this.retryAttempts) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay);
          this.retryDelay *= 1.5; // Exponential backoff
        }
      }
    }
    
    // All attempts failed
    console.error(`Failed to fetch RSS feed ${feed.name} after ${this.retryAttempts} attempts`);
    
    // Record failure for circuit breaker
    this.recordFailure(feed.id);
    
    // Update feed status with error in database
    await this.databaseService.updateFeedLastChecked(
      feed.id, 
      new Date(), 
      lastError?.message || 'All retry attempts failed'
    );
    
    return null;
  }

  async fetchAllFeeds(): Promise<Map<string, RSSFeedResponse>> {
    const feeds = await this.databaseService.getFeeds();
    const results = new Map<string, RSSFeedResponse>();
    
    console.log(`📡 Fetching ${feeds.filter(f => f.active).length} active RSS feeds...`);
    
    const promises = feeds
      .filter(feed => feed.active)
      .map(async (feed) => {
        const result = await this.fetchFeed(feed);
        if (result) {
          results.set(feed.id, result);
        }
        return { feedId: feed.id, success: !!result };
      });

    const results_array = await Promise.allSettled(promises);
    
    // Log results summary
    const successful = results_array.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results_array.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`📊 RSS Fetch Results: ${successful} successful, ${failed} failed out of ${feeds.filter(f => f.active).length} active feeds`);
    
    return results;
  }

  convertToNewsArticles(
    feedId: string, 
    feedResponse: RSSFeedResponse, 
    category: 'US_NATIONAL' | 'INTERNATIONAL' | 'FINANCE_MACRO'
  ): NewsArticle[] {
    return feedResponse.items.map(item => ({
      id: this.generateArticleId(feedId, item.guid, item.link),
      title: item.title,
      description: item.description,
      content: item.content,
      url: item.link,
      source: feedId,
      category,
      publishedAt: new Date(item.pubDate),
      processedAt: new Date(),
      briefGenerated: false,
      tags: this.extractTags(item.title, item.description)
    }));
  }

  private generateArticleId(feedId: string, guid: string, url: string): string {
    // Create a more unique ID by combining feed ID, GUID, and URL hash
    const urlHash = this.hashString(url);
    const guidHash = this.hashString(guid);
    
    // Use a combination that's more likely to be unique
    return `${feedId}-${guidHash}-${urlHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private extractTags(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const commonTags = [
      'politics', 'economy', 'finance', 'technology', 'health', 'education',
      'environment', 'immigration', 'foreign policy', 'trade', 'employment',
      'inflation', 'interest rates', 'elections', 'congress', 'white house'
    ];

    return commonTags.filter(tag => text.includes(tag));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isCircuitOpen(feedId: string): boolean {
    const status = this.failedFeeds.get(feedId);
    if (!status) return false;
    
    if (status.circuitOpen) {
      const timeSinceLastFailure = Date.now() - status.lastFailure;
      if (timeSinceLastFailure > this.circuitBreakerTimeout) {
        // Circuit breaker timeout expired, try again
        console.log(`🔄 Circuit breaker timeout expired for feed ${feedId}, attempting to fetch`);
        this.failedFeeds.delete(feedId);
        return false;
      }
      return true;
    }
    
    return false;
  }

  private recordFailure(feedId: string): void {
    const status = this.failedFeeds.get(feedId) || { failures: 0, lastFailure: 0, circuitOpen: false };
    status.failures++;
    status.lastFailure = Date.now();
    
    if (status.failures >= this.circuitBreakerThreshold) {
      status.circuitOpen = true;
      console.log(`🚫 Circuit breaker opened for feed ${feedId} after ${status.failures} consecutive failures`);
    }
    
    this.failedFeeds.set(feedId, status);
  }

  private recordSuccess(feedId: string): void {
    this.failedFeeds.delete(feedId);
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, { failures: number; lastFailure: number; circuitOpen: boolean; timeUntilReset?: number }> {
    const status: Record<string, { failures: number; lastFailure: number; circuitOpen: boolean; timeUntilReset?: number }> = {};
    
    for (const [feedId, feedStatus] of this.failedFeeds) {
      const timeUntilReset = feedStatus.circuitOpen 
        ? Math.max(0, this.circuitBreakerTimeout - (Date.now() - feedStatus.lastFailure))
        : undefined;
      
      status[feedId] = {
        ...feedStatus,
        timeUntilReset
      };
    }
    
    return status;
  }

  /**
   * Reset circuit breaker for a specific feed (for manual intervention)
   */
  resetCircuitBreaker(feedId: string): void {
    this.failedFeeds.delete(feedId);
    console.log(`🔄 Circuit breaker manually reset for feed ${feedId}`);
  }

  /**
   * Validate if a URL is properly formatted
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
