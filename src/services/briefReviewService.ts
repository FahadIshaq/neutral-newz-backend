import { supabase } from '../lib/supabase';
import { NewsBrief, BriefEditLog } from '../types';
import { AIService } from './aiService';

export class BriefReviewService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  async getPendingBriefs(): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending briefs:', error);
      throw error;
    }

    // Transform snake_case to camelCase for frontend compatibility
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async getBriefsByStatus(status: string): Promise<NewsBrief[]> {
    const { data, error } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching ${status} briefs:`, error);
      throw error;
    }

    // Transform snake_case to camelCase for frontend compatibility
    return (data || []).map(brief => this.transformBriefData(brief));
  }

  async approveBrief(briefId: string, reviewerId: string, notes?: string): Promise<NewsBrief> {
    const { data: brief, error: fetchError } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (fetchError || !brief) {
      throw new Error('Brief not found');
    }

    const previousStatus = brief.status;
    const newStatus = 'approved';

    // Update brief status
    const { data: updatedBrief, error: updateError } = await supabase
      .from('news_briefs')
      .update({
        status: newStatus,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to approve brief: ${updateError.message}`);
    }

    // Log the review action
    await this.logReviewAction({
      briefId,
      reviewerId,
      action: 'approve',
      previousStatus,
      newStatus,
      reviewNotes: notes,
    });

    return this.transformBriefData(updatedBrief);
  }

  async rejectBrief(briefId: string, reviewerId: string, notes: string): Promise<NewsBrief> {
    const { data: brief, error: fetchError } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (fetchError || !brief) {
      throw new Error('Brief not found');
    }

    const previousStatus = brief.status;
    const newStatus = 'rejected';

    // Update brief status
    const { data: updatedBrief, error: updateError } = await supabase
      .from('news_briefs')
      .update({
        status: newStatus,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to reject brief: ${updateError.message}`);
    }

    // Log the review action
    await this.logReviewAction({
      briefId,
      reviewerId,
      action: 'reject',
      previousStatus,
      newStatus,
      reviewNotes: notes,
    });

    return this.transformBriefData(updatedBrief);
  }

  async publishBrief(briefId: string, reviewerId: string): Promise<NewsBrief> {
    const { data: brief, error: fetchError } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (fetchError || !brief) {
      throw new Error('Brief not found');
    }

    if (brief.status !== 'approved') {
      throw new Error('Only approved briefs can be published');
    }

    const previousStatus = brief.status;
    const newStatus = 'published';

    // Update brief status
    const { data: updatedBrief, error: updateError } = await supabase
      .from('news_briefs')
      .update({
        status: newStatus,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to publish brief: ${updateError.message}`);
    }

    // Log the review action
    await this.logReviewAction({
      briefId,
      reviewerId,
      action: 'publish',
      previousStatus,
      newStatus,
    });

    return updatedBrief;
  }

  async unpublishBrief(briefId: string, reviewerId: string, notes?: string): Promise<NewsBrief> {
    const { data: brief, error: fetchError } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (fetchError || !brief) {
      throw new Error('Brief not found');
    }

    if (brief.status !== 'published') {
      throw new Error('Only published briefs can be unpublished');
    }

    const previousStatus = brief.status;
    const newStatus = 'unpublished';

    // Update brief status
    const { data: updatedBrief, error: updateError } = await supabase
      .from('news_briefs')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to unpublish brief: ${updateError.message}`);
    }

    // Log the review action
    await this.logReviewAction({
      briefId,
      reviewerId,
      action: 'unpublish',
      previousStatus,
      newStatus,
      reviewNotes: notes,
    });

    return updatedBrief;
  }

  async editBrief(briefId: string, reviewerId: string, changes: Partial<NewsBrief>, notes?: string): Promise<NewsBrief> {
    const { data: brief, error: fetchError } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (fetchError || !brief) {
      throw new Error('Brief not found');
    }

    const previousStatus = brief.status;
    const newStatus = 'pending'; // Reset to pending for re-review

    // Update brief with changes
    const { data: updatedBrief, error: updateError } = await supabase
      .from('news_briefs')
      .update({
        ...changes,
        status: newStatus,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to edit brief: ${updateError.message}`);
    }

    // Log the review action
    await this.logReviewAction({
      briefId,
      reviewerId,
      action: 'edit',
      previousStatus,
      newStatus,
      reviewNotes: notes,
      changesMade: changes,
    });

    return updatedBrief;
  }

  async reviseBriefWithAI(briefId: string, reviewerId: string): Promise<NewsBrief> {
    const { data: brief, error: fetchError } = await supabase
      .from('news_briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (fetchError || !brief) {
      throw new Error('Brief not found');
    }

    // Get source articles for context
    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select('*')
      .in('id', brief.sourceArticles);

    if (articlesError) {
      throw new Error(`Failed to fetch source articles: ${articlesError.message}`);
    }

    // Use AI service to revise the brief
    const { revisedBrief, tokensUsed, costUsd, subjectivityScore } = 
      await this.aiService.reviseBriefForBias(brief, articles || []);

    // Update brief with AI revision
    const { data: updatedBrief, error: updateError } = await supabase
      .from('news_briefs')
      .update({
        summary: revisedBrief.summary,
        status: 'pending', // Reset to pending for re-review
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: 'AI-assisted revision for bias reduction',
        llm_metadata: revisedBrief.llmMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update brief with AI revision: ${updateError.message}`);
    }

    // Log the review action
    await this.logReviewAction({
      briefId,
      reviewerId,
      action: 'edit',
      previousStatus: brief.status,
      newStatus: 'pending',
      reviewNotes: 'AI-assisted revision for bias reduction',
      changesMade: { summary: revisedBrief.summary },
    });

    return this.transformBriefData(updatedBrief);
  }

  async getReviewLogs(briefId?: string): Promise<BriefReviewLog[]> {
    let query = supabase
      .from('brief_review_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (briefId) {
      query = query.eq('brief_id', briefId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching review logs:', error);
      throw error;
    }

    return data || [];
  }

  private async logReviewAction(logData: Omit<BriefReviewLog, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('brief_review_logs')
      .insert({
        brief_id: logData.briefId,
        reviewer_id: logData.reviewerId,
        action: logData.action,
        previous_status: logData.previousStatus,
        new_status: logData.newStatus,
        review_notes: logData.reviewNotes,
        changes_made: logData.changesMade || {},
      });

    if (error) {
      console.error('Error logging review action:', error);
      // Don't throw error as this is not critical for the main operation
    }
  }

  async getReviewStats(): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalPublished: number;
    totalUnpublished: number;
  }> {
    const { data, error } = await supabase
      .from('news_briefs')
      .select('status');

    if (error) {
      throw new Error(`Failed to get review stats: ${error.message}`);
    }

    const stats = {
      totalPending: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalPublished: 0,
      totalUnpublished: 0,
    };

    data?.forEach(brief => {
      switch (brief.status) {
        case 'pending':
          stats.totalPending++;
          break;
        case 'approved':
          stats.totalApproved++;
          break;
        case 'rejected':
          stats.totalRejected++;
          break;
        case 'published':
          stats.totalPublished++;
          break;
        case 'unpublished':
          stats.totalUnpublished++;
          break;
      }
    });

    return stats;
  }

  // Transform database snake_case to TypeScript camelCase
  private transformBriefData(brief: any): NewsBrief {
    if (!brief) return brief as NewsBrief;
    
    return {
      id: brief.id,
      title: brief.title,
      summary: brief.summary,
      sourceArticles: brief.source_articles || [],
      category: brief.category,
      publishedAt: brief.published_at ? new Date(brief.published_at) : new Date(),
      tags: brief.tags || [],
      status: brief.status,
      // reviewedBy: brief.reviewed_by, // Field doesn't exist in NewsBrief type
      reviewedAt: brief.reviewed_at ? new Date(brief.reviewed_at) : undefined,
      reviewNotes: brief.review_notes,
      llmMetadata: brief.llm_metadata || {},
      createdAt: brief.created_at ? new Date(brief.created_at) : new Date(),
      updatedAt: brief.updated_at ? new Date(brief.updated_at) : new Date(),
    };
  }
}

