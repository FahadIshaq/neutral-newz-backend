import { NewsArticle, NewsBrief } from '../types';
import { 
  DAILY_ARTICLE_LIMIT, 
  MAX_ARTICLES_PER_CATEGORY, 
  CATEGORY_DISTRIBUTION,
  DEDUP_SIMILARITY_THRESHOLD,
  DEDUP_TITLE_SIMILARITY,
  DEDUP_CONTENT_SIMILARITY
} from '../utils/constants';

export interface DeduplicationResult {
  uniqueArticles: NewsArticle[];
  duplicateGroups: NewsArticle[][];
  distributionStats: {
    total: number;
    byCategory: Record<string, number>;
    remainingCapacity: Record<string, number>;
  };
}

export interface ArticleSimilarity {
  article1: NewsArticle;
  article2: NewsArticle;
  similarity: number;
  reason: 'title' | 'content' | 'url' | 'source';
}

export class DeduplicationService {
  private similarityCache = new Map<string, number>();

  /**
   * Main deduplication method that processes articles and ensures fair distribution
   */
  async deduplicateAndDistribute(
    articles: NewsArticle[],
    existingArticles: NewsArticle[] = []
  ): Promise<DeduplicationResult> {
    console.log(`🧹 Starting deduplication of ${articles.length} new articles`);
    
    // Step 1: Remove exact duplicates (same URL, title, or content)
    const exactDuplicates = this.removeExactDuplicates(articles);
    console.log(`✅ Removed ${exactDuplicates.length} exact duplicates`);
    
    // Step 2: Remove similar articles based on content similarity
    const uniqueArticles = this.removeSimilarArticles(exactDuplicates);
    console.log(`✅ Removed similar articles, ${uniqueArticles.length} unique articles remaining`);
    
    // Step 3: Check daily limits and distribute fairly
    const distributedArticles = await this.distributeArticlesFairly(uniqueArticles, existingArticles);
    
    // Step 4: Group duplicates for analysis
    const duplicateGroups = this.groupDuplicateArticles(articles, uniqueArticles);
    
    const result: DeduplicationResult = {
      uniqueArticles: distributedArticles,
      duplicateGroups,
      distributionStats: {
        total: distributedArticles.length,
        byCategory: this.countByCategory(distributedArticles),
        remainingCapacity: this.calculateRemainingCapacity(distributedArticles, existingArticles)
      }
    };
    
    console.log(`🎯 Deduplication complete: ${result.uniqueArticles.length} articles selected`);
    console.log(`📊 Distribution: ${JSON.stringify(result.distributionStats.byCategory)}`);
    
    return result;
  }

  /**
   * Remove exact duplicates based on URL, title, or content
   */
  private removeExactDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];
    
    for (const article of articles) {
      const key = this.generateArticleKey(article);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }
    
    return unique;
  }

  /**
   * Remove similar articles based on content similarity
   */
  private removeSimilarArticles(articles: NewsArticle[]): NewsArticle[] {
    if (articles.length <= 1) return articles;
    
    const unique: NewsArticle[] = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < articles.length; i++) {
      if (processed.has(articles[i].id)) continue;
      
      const similarGroup = [articles[i]];
      processed.add(articles[i].id);
      
      // Find similar articles
      for (let j = i + 1; j < articles.length; j++) {
        if (processed.has(articles[j].id)) continue;
        
        const similarity = this.calculateSimilarity(articles[i], articles[j]);
        if (similarity > DEDUP_SIMILARITY_THRESHOLD) {
          similarGroup.push(articles[j]);
          processed.add(articles[j].id);
        }
      }
      
      // Keep the best article from the similar group
      const bestArticle = this.selectBestArticle(similarGroup);
      unique.push(bestArticle);
    }
    
    return unique;
  }

  /**
   * Distribute articles fairly across categories while respecting daily limits
   */
  private async distributeArticlesFairly(
    articles: NewsArticle[], 
    existingArticles: NewsArticle[]
  ): Promise<NewsArticle[]> {
    // Count existing articles by category for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingToday = existingArticles.filter(article => 
      article.publishedAt >= today
    );
    
    const existingByCategory = this.countByCategory(existingToday);
    console.log(`📅 Existing articles today: ${JSON.stringify(existingByCategory)}`);
    
    // Calculate remaining capacity for each category
    const remainingCapacity = this.calculateRemainingCapacity(articles, existingArticles);
    console.log(`📊 Remaining capacity: ${JSON.stringify(remainingCapacity)}`);
    
    // Group articles by category
    const articlesByCategory = this.groupByCategory(articles);
    
    // Distribute articles fairly
    const distributed: NewsArticle[] = [];
    
    for (const [category, categoryArticles] of Object.entries(articlesByCategory)) {
      const maxAllowed = Math.min(
        MAX_ARTICLES_PER_CATEGORY,
        remainingCapacity[category] || 0
      );
      
      if (maxAllowed <= 0) {
        console.log(`⚠️ Category ${category} at capacity, skipping ${categoryArticles.length} articles`);
        continue;
      }
      
      // Sort by importance/recency and take the best ones
      const sortedArticles = this.sortArticlesByImportance(categoryArticles);
      const selectedArticles = sortedArticles.slice(0, maxAllowed);
      
      distributed.push(...selectedArticles);
      console.log(`✅ Category ${category}: selected ${selectedArticles.length}/${categoryArticles.length} articles`);
    }
    
    // Ensure total doesn't exceed daily limit
    if (distributed.length > DAILY_ARTICLE_LIMIT) {
      console.log(`⚠️ Total articles (${distributed.length}) exceed daily limit (${DAILY_ARTICLE_LIMIT}), truncating`);
      distributed.splice(DAILY_ARTICLE_LIMIT);
    }
    
    return distributed;
  }

  /**
   * Calculate similarity between two articles
   */
  private calculateSimilarity(article1: NewsArticle, article2: NewsArticle): number {
    const cacheKey = `${article1.id}-${article2.id}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }
    
    let totalSimilarity = 0;
    let factors = 0;
    
    // Title similarity
    if (article1.title && article2.title) {
      const titleSimilarity = this.calculateTextSimilarity(article1.title, article2.title);
      totalSimilarity += titleSimilarity * 0.4; // Title is 40% weight
      factors += 0.4;
    }
    
    // Content similarity
    if (article1.content && article2.content) {
      const contentSimilarity = this.calculateTextSimilarity(article1.content, article2.content);
      totalSimilarity += contentSimilarity * 0.4; // Content is 40% weight
      factors += 0.4;
    }
    
    // URL similarity
    if (article1.url && article2.url) {
      const urlSimilarity = this.calculateUrlSimilarity(article1.url, article2.url);
      totalSimilarity += urlSimilarity * 0.2; // URL is 20% weight
      factors += 0.2;
    }
    
    const finalSimilarity = factors > 0 ? totalSimilarity / factors : 0;
    this.similarityCache.set(cacheKey, finalSimilarity);
    
    return finalSimilarity;
  }

  /**
   * Calculate text similarity using Jaccard similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate URL similarity
   */
  private calculateUrlSimilarity(url1: string, url2: string): number {
    try {
      const parsed1 = new URL(url1);
      const parsed2 = new URL(url2);
      
      // Check if same domain
      if (parsed1.hostname !== parsed2.hostname) return 0;
      
      // Check path similarity
      const path1 = parsed1.pathname.split('/').filter(Boolean);
      const path2 = parsed2.pathname.split('/').filter(Boolean);
      
      if (path1.length === 0 && path2.length === 0) return 1;
      if (path1.length === 0 || path2.length === 0) return 0.5;
      
      const commonPaths = path1.filter(p => path2.includes(p));
      return commonPaths.length / Math.max(path1.length, path2.length);
    } catch {
      return 0;
    }
  }

  /**
   * Select the best article from a group of similar articles
   */
  private selectBestArticle(articles: NewsArticle[]): NewsArticle {
    if (articles.length === 1) return articles[0];
    
    // Score articles based on quality indicators
    const scored = articles.map(article => ({
      article,
      score: this.calculateArticleScore(article)
    }));
    
    // Sort by score (highest first) and return the best
    scored.sort((a, b) => b.score - a.score);
    return scored[0].article;
  }

  /**
   * Calculate article quality score
   */
  private calculateArticleScore(article: NewsArticle): number {
    let score = 0;
    
    // Content length (longer articles often have more detail)
    if (article.content) {
      score += Math.min(article.content.length / 1000, 2); // Max 2 points for content
    }
    
    // Source reliability (prefer official sources)
    if (article.source) {
      const officialSources = ['white-house', 'state-dept', 'defense-dept', 'federal-reserve', 'un-news'];
      if (officialSources.includes(article.source)) {
        score += 3;
      }
    }
    
    // Recency (newer articles get higher scores)
    const hoursSincePublished = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 5 - hoursSincePublished); // Max 5 points for recency
    
    return score;
  }

  /**
   * Sort articles by importance for fair distribution
   */
  private sortArticlesByImportance(articles: NewsArticle[]): NewsArticle[] {
    return articles.sort((a, b) => {
      const scoreA = this.calculateArticleScore(a);
      const scoreB = this.calculateArticleScore(b);
      return scoreB - scoreA; // Highest score first
    });
  }

  /**
   * Group articles by category
   */
  private groupByCategory(articles: NewsArticle[]): Record<string, NewsArticle[]> {
    return articles.reduce((acc, article) => {
      const category = article.category || 'US_NATIONAL';
      if (!acc[category]) acc[category] = [];
      acc[category].push(article);
      return acc;
    }, {} as Record<string, NewsArticle[]>);
  }

  /**
   * Count articles by category
   */
  private countByCategory(articles: NewsArticle[]): Record<string, number> {
    return articles.reduce((acc, article) => {
      const category = article.category || 'US_NATIONAL';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Calculate remaining capacity for each category
   */
  private calculateRemainingCapacity(
    newArticles: NewsArticle[], 
    existingArticles: NewsArticle[]
  ): Record<string, number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingToday = existingArticles.filter(article => 
      article.publishedAt >= today
    );
    
    const existingByCategory = this.countByCategory(existingToday);
    
    const capacity: Record<string, number> = {};
    for (const [category, ratio] of Object.entries(CATEGORY_DISTRIBUTION)) {
      const maxAllowed = Math.floor(DAILY_ARTICLE_LIMIT * ratio);
      const existing = existingByCategory[category] || 0;
      capacity[category] = Math.max(0, maxAllowed - existing);
    }
    
    return capacity;
  }

  /**
   * Group duplicate articles for analysis
   */
  private groupDuplicateArticles(
    originalArticles: NewsArticle[], 
    uniqueArticles: NewsArticle[]
  ): NewsArticle[][] {
    const uniqueIds = new Set(uniqueArticles.map(a => a.id));
    const duplicates = originalArticles.filter(a => !uniqueIds.has(a.id));
    
    // Group duplicates by similarity
    const groups: NewsArticle[][] = [];
    const processed = new Set<string>();
    
    for (const duplicate of duplicates) {
      if (processed.has(duplicate.id)) continue;
      
      const group = [duplicate];
      processed.add(duplicate.id);
      
      // Find similar duplicates
      for (const other of duplicates) {
        if (processed.has(other.id)) continue;
        
        const similarity = this.calculateSimilarity(duplicate, other);
        if (similarity > DEDUP_SIMILARITY_THRESHOLD) {
          group.push(other);
          processed.add(other.id);
        }
      }
      
      if (group.length > 1) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  /**
   * Generate a unique key for an article
   */
  private generateArticleKey(article: NewsArticle): string {
    const title = article.title?.toLowerCase().trim() || '';
    const url = article.url?.toLowerCase().trim() || '';
    const content = article.content?.toLowerCase().trim() || '';
    
    // Use a combination of identifiers
    return `${title}|${url}|${content.substring(0, 100)}`;
  }

  /**
   * Clear similarity cache to free memory
   */
  clearCache(): void {
    this.similarityCache.clear();
  }
}
