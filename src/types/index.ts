export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: 'US_NATIONAL' | 'INTERNATIONAL' | 'FINANCE_MACRO';
  active: boolean;
  lastChecked?: Date;
  lastError?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  source: string;
  category: 'US_NATIONAL' | 'INTERNATIONAL' | 'FINANCE_MACRO';
  publishedAt: Date;
  processedAt: Date;
  briefGenerated: boolean;
  briefContent?: string;
  tags: string[];
}

export interface NewsBrief {
  id: string;
  title: string;
  summary: string;
  sourceArticles: string[];
  category: 'US_NATIONAL' | 'INTERNATIONAL' | 'FINANCE_MACRO';
  publishedAt: Date;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'unpublished';
  reviewedBy?: string; // UUID string
  reviewedAt?: Date;
  reviewNotes?: string;
  llmMetadata?: {
    modelVersion: string;
    promptVersion: string;
    tokensUsed: number;
    costUsd: number;
    processingTimeMs: number;
    subjectivityScore: number;
    revisionCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BriefReviewLog {
  id: string; // UUID string
  briefId: string; // UUID string
  reviewerId: string; // UUID string
  action: 'approve' | 'reject' | 'publish' | 'unpublish' | 'edit';
  previousStatus: string;
  newStatus: string;
  reviewNotes?: string;
  changesMade?: Record<string, any>;
  timestamp: Date;
}

export interface RSSFeedResponse {
  title: string;
  description: string;
  items: RSSItem[];
}

export interface RSSItem {
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: string;
  guid: string;
}

export interface ProcessingResult {
  success: boolean;
  articlesProcessed: number;
  briefsGenerated: number;
  errors: string[];
  timestamp: Date;
  llmTokensUsed: number;
  llmCostUsd: number;
  modelVersion: string;
  promptVersion: string;
}
