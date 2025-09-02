import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './lib/supabase';
import { SimpleTableService } from './services/simpleTableService';
import { DatabaseService } from './services/databaseService';
import { ProcessingService } from './services/processingService';
import { EnhancedProcessingService } from './services/enhancedProcessingService';
import feedsRouter from './routes/feeds';
import authRouter from './routes/auth';
import briefsRouter from './routes/briefs';

import { authenticateToken, requireAdmin } from './middleware/auth';
import { RSSService } from './services/rssService';
import { BriefService } from './services/briefService';
import { AIService } from './services/aiService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development (admin-clean)
    'http://localhost:3001',  // Local backend
    'http://localhost:3002',  // Local news-digest frontend
    'https://neutral-newz-backend.onrender.com',  // Deployed backend
    'https://neutral-newz-admin.vercel.app',
    'https://neutral-newz-backend.onrender.com',
    'https://neutral-newz.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ensure all responses are JSON
app.use((req, res, next) => {
  // Set JSON content type for all responses
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Health check endpoint (public)
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const databaseService = new DatabaseService();
    const dbStats = await databaseService.getDatabaseStats();
    
    // Test RSS processing service
    const rssService = new RSSService();
    const briefService = new BriefService();
    const aiService = new AIService();
    const processingService = new ProcessingService(rssService, databaseService, briefService, aiService);
    const processingStatus = processingService.getProcessingStatus();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStats ? 'connected' : 'disconnected',
        tables: dbStats || {}
      },
      processing: processingStatus || { isProcessing: false }
    };

    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Public routes
app.use('/api/auth', authRouter);

// System status endpoint (public)
app.get('/api/system/status', async (req, res) => {
  try {
    // Test database connection
    const databaseService = new DatabaseService();
    const dbStats = await databaseService.getDatabaseStats();
    
    // Test RSS processing service
    const rssService = new RSSService();
    const briefService = new BriefService();
    const aiService = new AIService();
    const processingService = new ProcessingService(rssService, databaseService, briefService, aiService);
    const processingStatus = processingService.getProcessingStatus();
    
    // Get RSS feed health status
    const feeds = await databaseService.getFeeds();
    const feedHealth = feeds.map(feed => ({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      category: feed.category,
      active: feed.active,
      lastChecked: feed.lastChecked,
      lastError: feed.lastError,
      status: feed.lastError ? 'error' : 'healthy'
    }));
    
    // Get circuit breaker status
    const circuitBreakerStatus = rssService.getCircuitBreakerStatus();
    
    // Get enhanced processing status
    const enhancedProcessingStatus = enhancedProcessingService?.getProcessingStatus() || {
      isProcessing: false,
      queueSize: 0,
      lastProcessed: new Date(),
      isChecking: false
    };
    const queueStats = enhancedProcessingService?.getQueueStats() || {
      totalQueued: 0,
      byCategory: {},
      estimatedProcessingTime: 0
    };
    
    // Comprehensive system status
    const systemStatus = {
      success: true,
      data: {
        systemHealth: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024)
          },
          nodeVersion: process.version,
          platform: process.platform
        },
        apiStatus: {
          status: 'operational',
          endpoints: ['/health', '/api/auth/login', '/api/feeds', '/api/briefs', '/api/system/status'],
          lastCheck: new Date().toISOString()
        },
        databaseConnection: {
          status: 'connected',
          connection: 'active',
          tables: {
            rss_feeds: dbStats.totalFeeds,
            news_articles: dbStats.totalArticles,
            news_briefs: dbStats.totalBriefs,
            processing_logs: 'active'
          },
          lastCheck: new Date().toISOString()
        },
        rssFeeds: {
          status: 'operational',
          total: feeds.length,
          active: feeds.filter(f => f.active).length,
          healthy: feeds.filter(f => f.active && !f.lastError).length,
          error: feeds.filter(f => f.active && f.lastError).length,
          circuitBreakers: Object.keys(circuitBreakerStatus).length,
          feeds: feedHealth,
          circuitBreakerStatus
        },
        cronJobs: {
          status: 'active',
          rssProcessing: processingStatus.isProcessing ? 'active' : 'idle',
          schedule: 'Every 30 minutes',
          lastRun: processingStatus.lastRun || 'Not started yet'
        },
        enhancedProcessing: {
          status: 'active',
          checkingInterval: 'Every 30 seconds',
          processingInterval: 'Every 30 minutes',
          queueSize: queueStats.totalQueued,
          isProcessing: enhancedProcessingStatus.isProcessing,
          lastProcessed: enhancedProcessingStatus.lastProcessed,
          distribution: queueStats.byCategory,
          estimatedProcessingTime: queueStats.estimatedProcessingTime
        },
        errorLogging: {
          status: 'enabled',
          level: 'error',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    res.json(systemStatus);
    
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'System status check failed',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'System check failed'
    });
  }
});

// Protected routes
app.use('/api/feeds', authenticateToken, requireAdmin, feedsRouter);
app.use('/api/briefs', authenticateToken, requireAdmin, briefsRouter);

// Circuit breaker management endpoint (admin only)
app.post('/api/system/reset-circuit-breaker/:feedId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { feedId } = req.params;
    
    if (!feedId) {
      return res.status(400).json({
        success: false,
        error: 'Feed ID is required'
      });
    }
    
    if (!rssService) {
      return res.status(500).json({
        success: false,
        error: 'RSS service not initialized'
      });
    }
    
    rssService.resetCircuitBreaker(feedId);
    
    res.json({
      success: true,
      message: `Circuit breaker reset for feed ${feedId}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced processing control endpoints (admin only)
app.get('/api/system/enhanced-processing/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!enhancedProcessingService) {
      return res.status(500).json({
        success: false,
        error: 'Enhanced processing service not initialized'
      });
    }
    
    const status = enhancedProcessingService.getProcessingStatus();
    const queueStats = enhancedProcessingService.getQueueStats();
    
    res.json({
      success: true,
      data: {
        status,
        queueStats,
        dailyLimits: {
          total: 150,
          maxPerCategory: 50,
          distribution: {
            US_NATIONAL: '33.3% (50 max)',
            INTERNATIONAL: '33.3% (50 max)',
            FINANCE_MACRO: '33.4% (50 max)'
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get enhanced processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/system/enhanced-processing/process', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!enhancedProcessingService) {
      return res.status(500).json({
        success: false,
        error: 'Enhanced processing service not initialized'
      });
    }
    
    const result = await enhancedProcessingService.manualProcess();
    
    res.json({
      success: true,
      message: 'Manual processing triggered',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual processing',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/system/enhanced-processing/clear-queue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!enhancedProcessingService) {
      return res.status(500).json({
        success: false,
        error: 'Enhanced processing service not initialized'
      });
    }
    
    enhancedProcessingService.clearQueue();
    
    res.json({
      success: true,
      message: 'Processing queue cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear processing queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Daily limits status endpoint (public)
app.get('/api/system/daily-limits', async (req, res) => {
  try {
    const databaseService = new DatabaseService();
    
    // Get articles for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayArticles = await databaseService.getArticlesByDateRange(today, new Date());
    
    // Count by category
    const articlesByCategory = todayArticles.reduce((acc, article) => {
      const category = article.category || 'US_NATIONAL';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate remaining capacity
    const remainingCapacity = {
      US_NATIONAL: Math.max(0, 50 - (articlesByCategory.US_NATIONAL || 0)),
      INTERNATIONAL: Math.max(0, 50 - (articlesByCategory.INTERNATIONAL || 0)),
      FINANCE_MACRO: Math.max(0, 50 - (articlesByCategory.FINANCE_MACRO || 0))
    };
    
    const totalArticles = todayArticles.length;
    const totalRemaining = Object.values(remainingCapacity).reduce((sum, count) => sum + count, 0);
    
    const dailyLimitsStatus = {
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        limits: {
          total: {
            limit: 150,
            current: totalArticles,
            remaining: totalRemaining,
            percentage: Math.round((totalArticles / 150) * 100)
          },
          byCategory: {
            US_NATIONAL: {
              limit: 50,
              current: articlesByCategory.US_NATIONAL || 0,
              remaining: remainingCapacity.US_NATIONAL,
              percentage: Math.round(((articlesByCategory.US_NATIONAL || 0) / 50) * 100)
            },
            INTERNATIONAL: {
              limit: 50,
              current: articlesByCategory.INTERNATIONAL || 0,
              remaining: remainingCapacity.INTERNATIONAL,
              percentage: Math.round(((articlesByCategory.INTERNATIONAL || 0) /50) * 100)
            },
            FINANCE_MACRO: {
              limit: 50,
              current: articlesByCategory.FINANCE_MACRO || 0,
              remaining: remainingCapacity.FINANCE_MACRO,
              percentage: Math.round(((articlesByCategory.FINANCE_MACRO || 0) / 50) * 100)
            }
          }
        },
        status: {
          atLimit: totalArticles >= 150,
          categoriesAtLimit: Object.entries(remainingCapacity)
            .filter(([_, remaining]) => remaining === 0)
            .map(([category, _]) => category),
          canProcess: totalRemaining > 0
        }
      }
    };
    
    res.json(dailyLimitsStatus);
  } catch (error) {
    console.error('❌ Error getting daily limits status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily limits status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Public endpoints for news-digest frontend (no authentication required)
app.get('/api/public/briefs', async (req, res) => {
  try {
    const databaseService = new DatabaseService();
    const { page = 1, limit = 10, category, timeRange } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    // Get published briefs only
    let briefs = await databaseService.getBriefsByStatus('published');
    
    // Filter by category if specified
    if (category) {
      briefs = briefs.filter(brief => brief.category === category);
    }
    
    // Filter by time range if specified
    if (timeRange) {
      const timeRangeNum = parseInt(timeRange as string);
      const cutoffDate = new Date(Date.now() - timeRangeNum * 60 * 60 * 1000);
      briefs = briefs.filter(brief => new Date(brief.publishedAt) >= cutoffDate);
    }
    
    // Sort by published date (newest first)
    briefs.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    const total = briefs.length;
    const paginatedBriefs = briefs.slice(offset, offset + limitNum);
    
    // Transform briefs with resolved source URLs for public endpoints
    const transformedBriefs = await Promise.all(
      paginatedBriefs.map(brief => databaseService.transformBriefDataWithResolvedSources(brief))
    );
    
    res.json({
      success: true,
      data: {
        briefs: transformedBriefs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: offset + limitNum < total,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('❌ Error getting public briefs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get briefs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/public/briefs/category/:category', async (req, res) => {
  try {
    const databaseService = new DatabaseService();
    const { category } = req.params;
    const { page = 1, limit = 10, timeRange } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    // Get published briefs for specific category
    let briefs = await databaseService.getBriefsByStatus('published');
    briefs = briefs.filter(brief => brief.category === category);
    
    // Filter by time range if specified
    if (timeRange) {
      const timeRangeNum = parseInt(timeRange as string);
      const cutoffDate = new Date(Date.now() - timeRangeNum * 60 * 60 * 1000);
      briefs = briefs.filter(brief => new Date(brief.publishedAt) >= cutoffDate);
    }
    
    // Sort by published date (newest first)
    briefs.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    const total = briefs.length;
    const paginatedBriefs = briefs.slice(offset, offset + limitNum);
    
    // Transform briefs with resolved source URLs for public endpoints
    const transformedBriefs = await Promise.all(
      paginatedBriefs.map(brief => databaseService.transformBriefDataWithResolvedSources(brief))
    );
    
    res.json({
      success: true,
      data: {
        briefs: transformedBriefs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: offset + limitNum < total,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('❌ Error getting public briefs by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get briefs by category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/public/briefs/stats', async (req, res) => {
  try {
    const databaseService = new DatabaseService();
    
    // Get all briefs
    const allBriefs = await databaseService.getAllBriefs();
    
    // Count by status
    const stats = {
      totalPublished: allBriefs.filter(brief => brief.status === 'published').length,
      totalDraft: allBriefs.filter(brief => brief.status === 'draft').length,
      totalArchived: allBriefs.filter(brief => brief.status === 'archived').length,
      byCategory: {
        US_NATIONAL: allBriefs.filter(brief => brief.category === 'US_NATIONAL' && brief.status === 'published').length,
        INTERNATIONAL: allBriefs.filter(brief => brief.category === 'INTERNATIONAL' && brief.status === 'published').length,
        FINANCE_MACRO: allBriefs.filter(brief => brief.category === 'FINANCE_MACRO' && brief.status === 'published').length
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting public brief stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get brief stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/public/briefs/latest/:limit', async (req, res) => {
  try {
    const databaseService = new DatabaseService();
    const { limit } = req.params;
    const limitNum = parseInt(limit) || 10;
    
    // Get published briefs
    let briefs = await databaseService.getBriefsByStatus('published');
    
    // Sort by published date (newest first)
    briefs.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Take the latest N briefs
    const latestBriefs = briefs.slice(0, limitNum);
    
    // Transform briefs with resolved source URLs for public endpoints
    const transformedBriefs = await Promise.all(
      latestBriefs.map(brief => databaseService.transformBriefDataWithResolvedSources(brief))
    );
    
    res.json({
      success: true,
      data: transformedBriefs
    });
  } catch (error) {
    console.error('❌ Error getting latest public briefs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest briefs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/public/briefs/:id', async (req, res) => {
  try {
    const databaseService = new DatabaseService();
    const { id } = req.params;
    
    const brief = await databaseService.getBriefById(id);
    
    if (!brief) {
      return res.status(404).json({
        success: false,
        error: 'Brief not found'
      });
    }
    
    // Only return published briefs
    if (brief.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'Brief not found'
      });
    }
    
    // Transform brief with resolved source URLs for public endpoints
    const transformedBrief = await databaseService.transformBriefDataWithResolvedSources(brief);
    
    res.json({
      success: true,
      data: transformedBrief
    });
  } catch (error) {
    console.error('❌ Error getting public brief by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get brief',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Neutral News Backend API',
    version: '1.0.0',
    endpoints: {
      public: [
        'GET /health',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/public/briefs',
        'GET /api/public/briefs/stats',
        'GET /api/public/briefs/category/:category',
        'GET /api/public/briefs/latest/:limit',
        'GET /api/public/briefs/:id'
      ],
      protected: [
        'GET /api/feeds',
        'POST /api/feeds',
        'POST /api/feeds/:id/process',
        'POST /api/feeds/process-all',
        'GET /api/feeds/processing-status',
        'GET /api/briefs',
        'GET /api/briefs/latest/:limit',
        'GET /api/briefs/category/:category',
        'GET /api/briefs/:id',
        'GET /api/system/status',
        'GET /api/system/daily-limits',
        'GET /api/system/enhanced-processing/status',
        'POST /api/system/enhanced-processing/process',
        'POST /api/system/enhanced-processing/clear-queue',
        'POST /api/auth/register',
        'GET /api/auth/me',
        'POST /api/auth/change-password'
      ]
    },
    authentication: 'Bearer token required for protected endpoints'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Global error handler caught:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Ensure response hasn't been sent yet
  if (res.headersSent) {
    return next(error);
  }
  
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');
  
  // Always return JSON response
  try {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  } catch (jsonError) {
    // If JSON serialization fails, send a simple text response
    console.error('💥 JSON serialization failed:', jsonError);
    res.status(500).send('Internal server error - JSON serialization failed');
  }
});

// Global service instances
let enhancedProcessingService: EnhancedProcessingService | null = null;
let rssService: RSSService | null = null;
let briefService: BriefService | null = null;
let aiService: AIService | null = null;
let databaseService: DatabaseService | null = null;

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting Neutral News Backend...');
    
    // Set up global error handlers
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      console.error('Stack trace:', error.stack);
      // Don't exit immediately, let the error handler deal with it
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit immediately, let the error handler deal with it
    });
    
    // Test database connection
    await testDatabaseConnection();
    
    // Initialize tables
    const tableService = new SimpleTableService();
    try {
      await tableService.initializeTables();
    } catch (error) {
      console.log('⚠️ Table initialization had issues, but continuing...');
      console.log('📝 Please check the logs above and run database-schema.sql if needed');
    }
    
    // Get initial database stats
    databaseService = new DatabaseService();
    try {
      const stats = await databaseService.getDatabaseStats();
      console.log(`📊 Initial Database Stats: ${stats.totalFeeds} feeds, ${stats.activeFeeds} active, ${stats.totalArticles} articles, ${stats.totalBriefs} briefs`);
    } catch (error) {
      console.log('⚠️ Could not get initial database stats, but continuing...');
    }
    
    // Initialize and start enhanced RSS processing service
    rssService = new RSSService();
    briefService = new BriefService();
    aiService = new AIService();
    
    // Use enhanced processing service for better deduplication and distribution
    enhancedProcessingService = new EnhancedProcessingService(rssService, databaseService, briefService, aiService);
    enhancedProcessingService.startEnhancedProcessing();
    console.log('🚀 Enhanced RSS processing started: 30-second checking, 30-minute batching');
    
    // Keep legacy service for backward compatibility
    const processingService = new ProcessingService(rssService, databaseService, briefService, aiService);
    // Don't start legacy service - enhanced service handles everything
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Admin panel: https://neutral-newz-backend.onrender.com (requires authentication)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
