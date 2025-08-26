import { Router, Request, Response } from 'express';
import { BriefReviewService } from '../services/briefReviewService';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const briefReviewService = new BriefReviewService();

// GET /api/brief-review/pending - Get all pending briefs
router.get('/pending', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const briefs = await briefReviewService.getPendingBriefs();
    res.json({
      success: true,
      data: briefs,
    });
  } catch (error) {
    console.error('Error fetching pending briefs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /api/brief-review/status/:status - Get briefs by status
router.get('/status/:status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const briefs = await briefReviewService.getBriefsByStatus(status);
    res.json({
      success: true,
      data: briefs,
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.status} briefs:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /api/brief-review/approve/:id - Approve a brief
router.post('/approve/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const brief = await briefReviewService.approveBrief(id, reviewerId, notes);
    res.json({
      success: true,
      data: brief,
      message: 'Brief approved successfully',
    });
  } catch (error) {
    console.error('Error approving brief:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /api/brief-review/reject/:id - Reject a brief
router.post('/reject/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Rejection notes are required',
      });
    }

    const brief = await briefReviewService.rejectBrief(id, reviewerId, notes);
    res.json({
      success: true,
      data: brief,
      message: 'Brief rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting brief:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /api/brief-review/publish/:id - Publish a brief
router.post('/publish/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const brief = await briefReviewService.publishBrief(id, reviewerId);
    res.json({
      success: true,
      data: brief,
      message: 'Brief published successfully',
    });
  } catch (error) {
    console.error('Error publishing brief:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /api/brief-review/unpublish/:id - Unpublish a brief
router.post('/unpublish/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const brief = await briefReviewService.unpublishBrief(id, reviewerId, notes);
    res.json({
      success: true,
      data: brief,
      message: 'Brief unpublished successfully',
    });
  } catch (error) {
    console.error('Error unpublishing brief:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /api/brief-review/edit/:id - Edit a brief
router.post('/edit/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { changes, notes } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!changes || Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes provided',
      });
    }

    const brief = await briefReviewService.editBrief(id, reviewerId, changes, notes);
    res.json({
      success: true,
      data: brief,
      message: 'Brief edited successfully',
    });
  } catch (error) {
    console.error('Error editing brief:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /api/brief-review/revise-ai/:id - Revise brief using AI
router.post('/revise-ai/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const brief = await briefReviewService.reviseBriefWithAI(id, reviewerId);
    res.json({
      success: true,
      data: brief,
      message: 'Brief revised with AI successfully',
    });
  } catch (error) {
    console.error('Error revising brief with AI:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /api/brief-review/logs/:briefId? - Get review logs
router.get('/logs/:briefId?', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { briefId } = req.params;
    const logs = await briefReviewService.getReviewLogs(briefId);
    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching review logs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /api/brief-review/stats - Get review statistics
router.get('/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await briefReviewService.getReviewStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;

