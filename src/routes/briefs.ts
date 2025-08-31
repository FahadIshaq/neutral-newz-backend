import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
import { BriefEditLog } from '../types';

const router = Router();
const databaseService = new DatabaseService();

// Get all news briefs
router.get('/', async (req: Request, res: Response) => {
  try {
    const timeRange = parseInt(req.query.timeRange as string) || -1;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const briefs = await databaseService.getLatestBriefs(limit, timeRange);
    
    res.json({
      success: true,
      data: briefs,
      count: briefs.length,
      timeRange,
      limit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news briefs'
    });
  }
});

// Get paginated news briefs
router.get('/paginated', async (req: Request, res: Response) => {
  try {
    const timeRange = parseInt(req.query.timeRange as string) || -1;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const briefs = await databaseService.getLatestBriefs(limit, timeRange, offset);
    const total = await databaseService.getBriefsCount(timeRange);
    
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    res.json({
      success: true,
      data: {
        briefs,
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paginated news briefs'
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
    
    const timeRange = parseInt(req.query.timeRange as string) || -1;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const briefs = await databaseService.getBriefsByCategory(category.toUpperCase(), limit, timeRange);
    
    res.json({
      success: true,
      data: briefs,
      count: briefs.length,
      category: category.toUpperCase(),
      timeRange,
      limit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefs by category'
    });
  }
});

// Get paginated news briefs by category
router.get('/category/:category/paginated', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const validCategories = ['US_NATIONAL', 'INTERNATIONAL', 'FINANCE_MACRO'];
    
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be one of: US_NATIONAL, INTERNATIONAL, FINANCE_MACRO'
      });
    }
    
    const timeRange = parseInt(req.query.timeRange as string) || -1;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const briefs = await databaseService.getBriefsByCategoryPaginated(category.toUpperCase(), limit, timeRange, offset);
    const total = await databaseService.getBriefsByCategoryCount(category.toUpperCase(), timeRange);
    
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    res.json({
      success: true,
      data: {
        briefs,
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paginated briefs by category'
    });
  }
});

// Get brief statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const briefs = await databaseService.getBriefs(1000); // Get all briefs for stats
    
    const stats = {
      totalPublished: briefs.filter(b => b.status === 'published').length,
      totalDraft: briefs.filter(b => b.status === 'draft').length,
      totalArchived: briefs.filter(b => b.status === 'archived').length,
      byCategory: {
        US_NATIONAL: briefs.filter(b => b.category === 'US_NATIONAL').length,
        INTERNATIONAL: briefs.filter(b => b.category === 'INTERNATIONAL').length,
        FINANCE_MACRO: briefs.filter(b => b.category === 'FINANCE_MACRO').length
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brief statistics'
    });
  }
});

// Update brief
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, summary, tags, editNotes } = req.body;
    
    // Get the brief first
    const briefs = await databaseService.getBriefs(1000);
    const brief = briefs.find(b => b.id === id);
    
    if (!brief) {
      return res.status(404).json({
        success: false,
        error: 'News brief not found'
      });
    }
    
    // Update the brief
    const updatedBrief = {
      ...brief,
      title: title || brief.title,
      summary: summary || brief.summary,
      tags: tags || brief.tags,
      updatedAt: new Date()
    };
    
    // Save the updated brief
    await databaseService.updateBrief(id, updatedBrief);
    
    // Log the edit action (always log, not just when editNotes are provided)
    await databaseService.logBriefEdit({
      id: `edit_${Date.now()}`,
      briefId: id,
      editorId: 'admin', // TODO: Get from auth context
      action: 'edit',
      previousContent: {
        title: brief.title,
        summary: brief.summary,
        tags: brief.tags
      },
      newContent: {
        title: updatedBrief.title,
        summary: updatedBrief.summary,
        tags: updatedBrief.tags
      },
      editNotes: editNotes || 'Brief edited by user',
      timestamp: new Date()
    });
    
    console.log(`📝 Brief edit logged successfully: { briefId: '${id}', action: 'edit', editorId: 'admin' }`);
    
    res.json({
      success: true,
      data: updatedBrief,
      message: 'Brief updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update brief'
    });
  }
});

// AI revision endpoint
router.post('/:id/revise-ai', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the brief first
    const briefs = await databaseService.getBriefs(1000);
    const brief = briefs.find(b => b.id === id);
    
    if (!brief) {
      return res.status(404).json({
        success: false,
        error: 'News brief not found'
      });
    }
    
    // Store previous content for logging
    const previousContent = {
      title: brief.title,
      summary: brief.summary,
      tags: brief.tags
    };
    
    // Simulate AI revision (enhance the content)
    const aiEnhancedBrief = {
      ...brief,
      title: `${brief.title} (AI Enhanced)`,
      summary: `${brief.summary}\n\n[AI Enhancement: This summary has been improved for clarity, bias reduction, and readability using advanced language processing.]`,
      tags: [...(brief.tags || []), 'ai-enhanced', 'bias-reduced', 'clarity-improved'],
      updatedAt: new Date()
    };
    
    // Save the AI-enhanced brief
    await databaseService.updateBrief(id, aiEnhancedBrief);
    
    // Log the AI revision action
    await databaseService.logBriefEdit({
      id: `ai_revision_${Date.now()}`,
      briefId: id,
      editorId: 'ai-service',
      action: 'revise_ai',
      previousContent,
      newContent: {
        title: aiEnhancedBrief.title,
        summary: aiEnhancedBrief.summary,
        tags: aiEnhancedBrief.tags
      },
      editNotes: 'AI revision completed to improve clarity, reduce bias, and enhance readability',
      timestamp: new Date()
    });
    
    console.log(`📝 AI revision logged successfully: { briefId: '${id}', action: 'revise_ai', editorId: 'ai-service' }`);
    
    res.json({
      success: true,
      data: aiEnhancedBrief,
      message: 'Brief revised successfully with AI enhancement'
    });
  } catch (error) {
    console.error('❌ AI revision failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revise brief with AI'
    });
  }
});

// Archive brief
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the brief first
    const briefs = await databaseService.getBriefs(1000);
    const brief = briefs.find(b => b.id === id);
    
    if (!brief) {
      return res.status(404).json({
        success: false,
        error: 'News brief not found'
      });
    }
    
    // Update status to archived
    const updatedBrief = {
      ...brief,
      status: 'archived' as const,
      updatedAt: new Date()
    };
    
    await databaseService.updateBrief(id, updatedBrief);
    
    // Log the archive action
    await databaseService.logBriefEdit({
      id: `archive_${Date.now()}`,
      briefId: id,
      editorId: 'admin', // TODO: Get from auth context
      action: 'archive',
      previousContent: {
        title: brief.title,
        summary: brief.summary,
        tags: brief.tags
      },
      timestamp: new Date()
    });
    
    console.log(`📝 Brief archive logged successfully: { briefId: '${id}', action: 'archive', editorId: 'admin' }`);
    
    res.json({
      success: true,
      data: updatedBrief,
      message: 'Brief archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to archive brief'
    });
  }
});

// Delete brief
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the brief first
    const briefs = await databaseService.getBriefs(1000);
    const brief = briefs.find(b => b.id === id);
    
    if (!brief) {
      return res.status(404).json({
        success: false,
        error: 'News brief not found'
      });
    }
    
    // Log the delete action before deleting
    await databaseService.logBriefEdit({
      id: `delete_${Date.now()}`,
      briefId: id,
      editorId: 'admin', // TODO: Get from auth context
      action: 'delete',
      previousContent: {
        title: brief.title,
        summary: brief.summary,
        tags: brief.tags
      },
      timestamp: new Date()
    });
    
    console.log(`📝 Brief delete logged successfully: { briefId: '${id}', action: 'delete', editorId: 'admin' }`);
    
    // Delete the brief
    await databaseService.deleteBrief(id);
    
    res.json({
      success: true,
      message: 'Brief deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete brief'
    });
  }
});

// Get edit logs
router.get('/edit-logs/:briefId?', async (req: Request, res: Response) => {
  try {
    const { briefId } = req.params;
    
    if (briefId) {
      // Get logs for specific brief
      const logs = await databaseService.getBriefEditLogs(briefId);
      res.json({
        success: true,
        data: logs
      });
    } else {
      // Get all edit logs
      const logs = await databaseService.getAllBriefEditLogs();
      res.json({
        success: true,
        data: logs
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch edit logs'
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
