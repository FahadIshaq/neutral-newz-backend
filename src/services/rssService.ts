import axios from 'axios';
import Parser from 'rss-parser';
import { RSSFeed, RSSFeedResponse, RSSItem, NewsArticle } from '../types';
import { MAX_ARTICLES_PER_FEED } from '../utils/constants';
import { DatabaseService } from './databaseService';

export class RSSService {
  private parser: Parser;
  private databaseService: DatabaseService;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['content', 'guid']
      }
    });
    this.databaseService = new DatabaseService();
  }

  async fetchFeed(feed: RSSFeed): Promise<RSSFeedResponse | null> {
    try {
      console.log(`Fetching RSS feed: ${feed.name} (${feed.url})`);
      
      const response = await axios.get(feed.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'NeutralNews/1.0 (RSS Reader)'
        }
      });

      const parsed = await this.parser.parseString(response.data);
      
      // Update feed status in database
      await this.databaseService.updateFeedLastChecked(feed.id, new Date());
      
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
      console.error(`Error fetching RSS feed ${feed.name}:`, error);
      
      // Update feed status with error in database
      await this.databaseService.updateFeedLastChecked(
        feed.id, 
        new Date(), 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      return null;
    }
  }

  async fetchAllFeeds(): Promise<Map<string, RSSFeedResponse>> {
    const feeds = await this.databaseService.getFeeds();
    const results = new Map<string, RSSFeedResponse>();
    
    const promises = feeds
      .filter(feed => feed.active)
      .map(async (feed) => {
        const result = await this.fetchFeed(feed);
        if (result) {
          results.set(feed.id, result);
        }
        return { feedId: feed.id, success: !!result };
      });

    await Promise.allSettled(promises);
    
    console.log(`Fetched ${results.size} out of ${feeds.filter(f => f.active).length} active feeds`);
    return results;
  }

  convertToNewsArticles(
    feedId: string, 
    feedResponse: RSSFeedResponse, 
    category: 'US_NATIONAL' | 'INTERNATIONAL' | 'FINANCE_MACRO'
  ): NewsArticle[] {
    return feedResponse.items.map(item => ({
      id: this.generateArticleId(feedId, item.guid),
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

  private generateArticleId(feedId: string, guid: string): string {
    return `${feedId}-${guid.replace(/[^a-zA-Z0-9]/g, '')}`;
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
}
