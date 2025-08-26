import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const databaseService = new DatabaseService();

// Get all news briefs
router.get('/', async (req: Request, res: Response) => {
  try {
    const briefs = await databaseService.getBriefs();
    
    res.json({
      success: true,
      data: briefs,
      count: briefs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news briefs'
    });
  }
});

// Get latest news briefs (must come before /:id route)
router.get('/latest/:limit', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    const briefs = await databaseService.getLatestBriefs(limit);
    
    res.json({
      success: true,
      data: briefs,
      count: briefs.length,
      limit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest news briefs'
    });
  }
});

// Get news briefs by category
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
    
    const briefs = await databaseService.getBriefsByCategory(category.toUpperCase());
    
    res.json({
      success: true,
      data: briefs,
      count: briefs.length,
      category: category.toUpperCase()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefs by category'
    });
  }
});

// Get single news brief by ID (must come last)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // For now, we'll get from the latest briefs and find by ID
    // In a real implementation, you'd have a getBriefById method
    const briefs = await databaseService.getBriefs(1000); // Get all briefs
    const brief = briefs.find(b => b.id === id);
    
    if (!brief) {
      return res.status(404).json({
        success: false,
        error: 'News brief not found'
      });
    }
    
    res.json({
      success: true,
      data: brief
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news brief'
    });
  }
});

export default router;
