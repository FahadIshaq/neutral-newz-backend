import { NewsArticle, NewsBrief } from '../types';
import { MAX_BRIEF_LENGTH, MIN_ARTICLES_FOR_BRIEF } from '../utils/constants';

export class BriefService {
  
  generateBriefs(articles: NewsArticle[]): NewsBrief[] {
    const briefs: NewsBrief[] = [];
    
    // Group articles by category and tags
    const groupedArticles = this.groupArticlesByCategoryAndTags(articles);
    
    for (const [key, groupArticles] of groupedArticles) {
      if (groupArticles.length >= MIN_ARTICLES_FOR_BRIEF) {
        const brief = this.createBriefFromArticles(groupArticles);
        if (brief) {
          briefs.push(brief);
        }
      }
    }
    
    return briefs;
  }

  private groupArticlesByCategoryAndTags(articles: NewsArticle[]): Map<string, NewsArticle[]> {
    const groups = new Map<string, NewsArticle[]>();
    
    for (const article of articles) {
      // Create key based on category and primary tags
      const primaryTags = this.getPrimaryTags(article.tags);
      const key = `${article.category}:${primaryTags.join(',')}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(article);
    }
    
    return groups;
  }

  private getPrimaryTags(tags: string[]): string[] {
    // Return top 2 most relevant tags
    return tags.slice(0, 2);
  }

  private createBriefFromArticles(articles: NewsArticle[]): NewsBrief | null {
    if (articles.length < MIN_ARTICLES_FOR_BRIEF) {
      return null;
    }

    // Sort articles by publication date (newest first)
    const sortedArticles = articles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const category = articles[0].category;
    const tags = this.mergeTags(articles.map(a => a.tags));
    
    // Create a brief title from the most recent article
    const title = this.generateBriefTitle(sortedArticles[0]);
    
    // Generate summary from multiple articles
    const summary = this.generateSummary(sortedArticles);
    
    return {
      id: this.generateBriefId(category, tags),
      title,
      summary,
      sourceArticles: articles.map(a => a.id),
      category,
      publishedAt: new Date(),
      tags,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private generateBriefTitle(article: NewsArticle): string {
    // Extract key concepts from the title
    const words = article.title.split(' ').filter(word => 
      word.length > 3 && !this.isCommonWord(word.toLowerCase())
    );
    
    // Take first 3-5 meaningful words
    const keyWords = words.slice(0, Math.min(5, words.length));
    return keyWords.join(' ').replace(/[^\w\s]/g, '');
  }

  private generateSummary(articles: NewsArticle[]): string {
    // Combine descriptions from multiple articles
    const descriptions = articles
      .slice(0, 3) // Use top 3 articles
      .map(a => a.description)
      .filter(desc => desc.length > 20);
    
    if (descriptions.length === 0) {
      return 'Multiple news sources report on recent developments in this area.';
    }
    
    // Create a combined summary
    let summary = descriptions.join(' ');
    
    // Truncate to max length
    if (summary.length > MAX_BRIEF_LENGTH) {
      summary = summary.substring(0, MAX_BRIEF_LENGTH - 3) + '...';
    }
    
    return summary;
  }

  private mergeTags(allTags: string[][]): string[] {
    const tagCount = new Map<string, number>();
    
    for (const tags of allTags) {
      for (const tag of tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    
    // Return tags that appear in multiple articles
    return Array.from(tagCount.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .map(([tag, _]) => tag)
      .slice(0, 5); // Top 5 most common tags
  }

  private generateBriefId(category: string, tags: string[]): string {
    const timestamp = Date.now();
    const tagString = tags.slice(0, 2).join('-').replace(/[^a-zA-Z0-9]/g, '');
    return `${category}-${tagString}-${timestamp}`;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'within', 'without'
    ];
    return commonWords.includes(word);
  }
}
