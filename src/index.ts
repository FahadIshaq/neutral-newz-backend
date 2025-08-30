import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './lib/supabase';
import { SimpleTableService } from './services/simpleTableService';
import { DatabaseService } from './services/databaseService';
import { ProcessingService } from './services/processingService';
import feedsRouter from './routes/feeds';
import authRouter from './routes/auth';
import briefsRouter from './routes/briefs';
import briefReviewRouter from './routes/briefReview';
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
    'http://localhost:3000',  // Local development
    'https://neutral-newz-backend.onrender.com',  // Deployed backend
    'https://neutral-newz-admin.vercel.app'
  ],
  credentials: true
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
app.use('/api/brief-review', authenticateToken, requireAdmin, briefReviewRouter);

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
    
    const rssService = new RSSService();
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Neutral News Backend API',
    version: '1.0.0',
    endpoints: {
      public: [
        'GET /health',
        'POST /api/auth/login',
        'POST /api/auth/logout'
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
    const databaseService = new DatabaseService();
    try {
      const stats = await databaseService.getDatabaseStats();
      console.log(`📊 Initial Database Stats: ${stats.totalFeeds} feeds, ${stats.activeFeeds} active, ${stats.totalArticles} articles, ${stats.totalBriefs} briefs`);
    } catch (error) {
      console.log('⚠️ Could not get initial database stats, but continuing...');
    }
    
    // Initialize and start RSS processing service
    const rssService = new RSSService();
    const briefService = new BriefService();
    const aiService = new AIService();
    const processingService = new ProcessingService(rssService, databaseService, briefService, aiService);
    processingService.startScheduledProcessing();
    console.log('⏰ RSS processing scheduled every 30 minutes');
    
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
