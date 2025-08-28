import { Router, Request, Response } from 'express';
import { RSSService } from '../services/rssService';
import { DatabaseService } from '../services/databaseService';
import { BriefService } from '../services/briefService';
import { AIService } from '../services/aiService';
import { ProcessingService } from '../services/processingService';
import { supabase } from '../lib/supabase';

const router = Router();
const rssService = new RSSService();
const databaseService = new DatabaseService();
const briefService = new BriefService();
const aiService = new AIService();
const processingService = new ProcessingService(rssService, databaseService, briefService, aiService);

// Get all RSS feeds
router.get('/', async (req: Request, res: Response) => {
  try {
    const feeds = await databaseService.getFeeds();
    console.log('📰 Backend: Retrieved feeds:', feeds.length);
    console.log('📰 Backend: First feed structure:', feeds[0]);
    
    const response = {
      success: true,
      data: feeds,
      count: feeds.length
    };
    
    console.log('📰 Backend: Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Backend: Error fetching feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS feeds'
    });
  }
});

// Create new RSS feed
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, name, url, category, active = true } = req.body;
    
    // Validation
    if (!id || !name || !url || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, url, category'
      });
    }
    
    const validCategories = ['US_NATIONAL', 'INTERNATIONAL', 'FINANCE_MACRO'];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be one of: US_NATIONAL, INTERNATIONAL, FINANCE_MACRO'
      });
    }
    
    const newFeed = {
      id,
      name,
      url,
      category: category.toUpperCase(),
      active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('rss_feeds')
      .insert(newFeed);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create RSS feed',
        details: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      data: newFeed,
      message: 'RSS feed created successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create RSS feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Populate initial RSS feeds
router.post('/populate-initial', async (req: Request, res: Response) => {
  try {
    const initialFeeds = [
      { id: 'npr-national', name: 'NPR National', url: 'https://feeds.npr.org/1003/rss.xml', category: 'US_NATIONAL' },
      { id: 'npr-politics', name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml', category: 'US_NATIONAL' },
      { id: 'pbs-headlines', name: 'PBS NewsHour Headlines', url: 'https://www.pbs.org/newshour/feeds/rss/headlines', category: 'US_NATIONAL' },
      { id: 'pbs-politics', name: 'PBS NewsHour Politics', url: 'https://www.pbs.org/newshour/feeds/rss/politics', category: 'US_NATIONAL' },
      { id: 'white-house', name: 'White House Press', url: 'https://www.whitehouse.gov/news/feed/', category: 'US_NATIONAL' },
      { id: 'state-dept', name: 'State Department', url: 'https://www.state.gov/feed/', category: 'US_NATIONAL' },
      { id: 'defense-dept', name: 'Defense Department', url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=944&max=20', category: 'US_NATIONAL' },
      { id: 'nytimes-politics', name: 'NYT Politics', url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/politics/rss.xml', category: 'US_NATIONAL' },
      { id: 'politico-picks', name: 'Politico Picks', url: 'https://www.politico.com/rss/politicopicks.xml', category: 'US_NATIONAL' },
      { id: 'rollcall', name: 'Roll Call', url: 'https://rollcall.com/feed/', category: 'US_NATIONAL' },
      { id: 'bbc-world', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'INTERNATIONAL' },
      { id: 'aljazeera-world', name: 'Al Jazeera World', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'INTERNATIONAL' },
      { id: 'france24-world', name: 'France 24 World', url: 'https://www.france24.com/en/rss', category: 'INTERNATIONAL' },
      { id: 'un-news', name: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', category: 'INTERNATIONAL' },
      { id: 'npr-world', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', category: 'INTERNATIONAL' },
      { id: 'federal-reserve', name: 'Federal Reserve Press', url: 'https://www.federalreserve.gov/feeds/press_all.xml', category: 'FINANCE_MACRO' },
      { id: 'npr-economy', name: 'NPR Economy', url: 'https://feeds.npr.org/1017/rss.xml', category: 'FINANCE_MACRO' },
      { id: 'pbs-economy', name: 'PBS NewsHour Economy', url: 'https://www.pbs.org/newshour/feeds/rss/economy', category: 'FINANCE_MACRO' },
      { id: 'imf-press', name: 'IMF Press', url: 'https://www.imf.org/external/cntpst/prfeed.aspx', category: 'FINANCE_MACRO' }
    ];
    
    const { error } = await supabase
      .from('rss_feeds')
      .upsert(initialFeeds, { onConflict: 'id' });
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to populate initial RSS feeds',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      data: initialFeeds,
      message: 'Initial RSS feeds populated successfully',
      count: initialFeeds.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to populate initial RSS feeds',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get RSS feeds by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const validCategories = ['US_NATIONAL', 'INTERNATIONAL', 'FINANCE_MACRO'];
    
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be one of: US_NATIONAL, INTERNATIONAL, FINANCE_MACRO'
      });
    }
    
    const feeds = await databaseService.getFeedsByCategory(category.toUpperCase());
    
    res.json({
      success: true,
      data: feeds,
      count: feeds.length,
      category: category.toUpperCase()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feeds by category'
    });
  }
});

// Get single RSS feed by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feed = await databaseService.getFeed(id);
    
    if (!feed) {
      return res.status(404).json({
        success: false,
        error: 'RSS feed not found'
      });
    }
    
    res.json({
      success: true,
      data: feed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS feed'
    });
  }
});

// Get processing status
router.get('/processing-status', async (req: Request, res: Response) => {
  try {
    const isProcessing = processingService.getProcessingStatus();
    res.json({
      success: true,
      data: {
        isProcessing: isProcessing.isProcessing,
        lastRun: isProcessing.lastRun
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get processing status'
    });
  }
});

// Process single RSS feed
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Processing single feed: ${id}`);
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Feed ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Set a timeout for the entire processing operation
    const processingPromise = processingService.processSingleFeed(id);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout after 10 minutes')), 600000);
    });
    
    const result = await Promise.race([processingPromise, timeoutPromise]);
    
    console.log(`✅ Feed processing completed:`, {
      feedId: id,
      success: result.success,
      articlesProcessed: result.articlesProcessed,
      briefsGenerated: result.briefsGenerated,
      errors: result.errors?.length || 0
    });
    
    // Debug: Log the raw result object
    console.log('🔍 Raw result object:', {
      type: typeof result,
      keys: Object.keys(result),
      hasOwnProperty: {
        timestamp: result.hasOwnProperty('timestamp'),
        timestampType: typeof result.timestamp,
        timestampValue: result.timestamp
      }
    });
    
    // Ensure we always return a valid JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Create a clean, serializable response object
      const cleanResult = {
        success: result.success,
        articlesProcessed: result.articlesProcessed,
        briefsGenerated: result.briefsGenerated,
        errors: result.errors || [],
        timestamp: result.timestamp instanceof Date ? result.timestamp.toISOString() : new Date().toISOString(),
        llmTokensUsed: result.llmTokensUsed || 0,
        llmCostUsd: result.llmCostUsd || 0,
        modelVersion: result.modelVersion || 'gpt-4o-mini',
        promptVersion: result.promptVersion || 'fact-check-v1.0'
      };
      
      // Debug: Log the clean result to ensure it's serializable
      console.log('📤 Clean result object:', cleanResult);
      
      // Test JSON serialization before sending
      const testSerialization = JSON.stringify(cleanResult);
      console.log('🧪 JSON serialization test passed:', testSerialization.substring(0, 200) + '...');
      
      // Check if response has already been sent
      if (res.headersSent) {
        console.error('❌ Response already sent, cannot send again');
        return;
      }
      
      res.json({
        success: true,
        data: cleanResult,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Response sent successfully');
      
    } catch (jsonError) {
      console.error('❌ JSON serialization failed:', jsonError);
      console.error('❌ Result object that failed:', result);
      console.error('❌ Result object type:', typeof result);
      console.error('❌ Result object keys:', Object.keys(result));
      
      // Check if response has already been sent
      if (res.headersSent) {
        console.error('❌ Response already sent, cannot send error response');
        return;
      }
      
      // Fallback response if JSON serialization fails
      res.status(500).json({
        success: false,
        error: 'Response serialization failed',
        details: 'The processing completed but response could not be serialized',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error(`❌ Error processing feed ${req.params.id}:`, error);
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    // Ensure we always return JSON with proper headers
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      error: 'Failed to process RSS feed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Process all RSS feeds
router.post('/process-all', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting processing of all feeds...');
    
    const result = await processingService.processAllFeeds();
    
    console.log(`✅ All feeds processing completed:`, {
      success: result.success,
      articlesProcessed: result.articlesProcessed,
      briefsGenerated: result.briefsGenerated,
      errors: result.errors?.length || 0
    });
    
    try {
      // Create a clean, serializable response object
      const cleanResult = {
        success: result.success,
        articlesProcessed: result.articlesProcessed,
        briefsGenerated: result.briefsGenerated,
        errors: result.errors || [],
        timestamp: result.timestamp instanceof Date ? result.timestamp.toISOString() : new Date().toISOString(),
        llmTokensUsed: result.llmTokensUsed || 0,
        llmCostUsd: result.llmCostUsd || 0,
        modelVersion: result.modelVersion || 'gpt-4o-mini',
        promptVersion: result.promptVersion || 'fact-check-v1.0'
      };
      
      // Debug: Log the clean result to ensure it's serializable
      console.log('📤 Sending response:', JSON.stringify(cleanResult, null, 2));
      
      res.json({
        success: true,
        data: cleanResult,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Response sent successfully');
      
    } catch (jsonError) {
      console.error('❌ JSON serialization failed:', jsonError);
      console.error('❌ Result object that failed:', result);
      
      // Fallback response if JSON serialization fails
      res.status(500).json({
        success: false,
        error: 'Response serialization failed',
        details: 'The processing completed but response could not be serialized',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error processing all feeds:', error);
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    // Ensure we always return JSON
    res.status(500).json({
      success: false,
      error: 'Failed to process RSS feeds',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
