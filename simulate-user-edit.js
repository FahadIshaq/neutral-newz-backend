#!/usr/bin/env node

/**
 * Simulate a real user editing a brief
 * This will create real edit logs that the frontend can display
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function simulateUserEdit() {
  console.log('👤 Simulating Real User Edit...\n');

  try {
    // Get a real brief to edit
    console.log('1️⃣ Getting a real brief...');
    const { data: briefs, error: briefsError } = await supabase
      .from('news_briefs')
      .select('id, title, summary, tags')
      .limit(1);
    
    if (briefsError || !briefs || briefs.length === 0) {
      console.error('❌ No briefs found to edit');
      return;
    }
    
    const brief = briefs[0];
    console.log('✅ Found brief:', brief.title);
    
    // Simulate user editing the brief
    console.log('\n2️⃣ Simulating user edit...');
    
    const editLog = {
      brief_id: brief.id,
      action: 'edit',
      editor_id: 'admin@example.com',
      previous_content: {
        title: brief.title,
        summary: brief.summary,
        tags: brief.tags || []
      },
      new_content: {
        title: brief.title + ' (Updated)',
        summary: brief.summary + ' [Content improved by user]',
        tags: [...(brief.tags || []), 'user-edited', 'updated']
      },
      edit_notes: 'User manually edited this brief to improve clarity and add relevant tags',
      metadata: {
        source: 'user-edit',
        edit_type: 'manual',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date().toISOString()
      }
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('brief_edit_logs')
      .insert(editLog)
      .select();
    
    if (insertError) {
      console.error('❌ Error creating edit log:', insertError);
      return;
    }
    
    console.log('✅ User edit log created successfully!');
    console.log('📝 Log ID:', insertResult[0].id);
    
    // Simulate AI revision
    console.log('\n3️⃣ Simulating AI revision...');
    
    const aiRevisionLog = {
      brief_id: brief.id,
      action: 'revise_ai',
      editor_id: 'ai-service',
      previous_content: {
        title: brief.title + ' (Updated)',
        summary: brief.summary + ' [Content improved by user]',
        tags: [...(brief.tags || []), 'user-edited', 'updated']
      },
      new_content: {
        title: brief.title + ' (AI Enhanced)',
        summary: brief.summary + ' [Content improved by user] [AI-enhanced for clarity and bias reduction]',
        tags: [...(brief.tags || []), 'user-edited', 'updated', 'ai-enhanced', 'bias-reduced']
      },
      edit_notes: 'AI revision completed to improve clarity, reduce bias, and enhance readability',
      metadata: {
        source: 'ai-revision',
        model: 'gpt-4o-mini',
        tokens_used: 245,
        cost_usd: 0.0032,
        processing_time_ms: 1250,
        timestamp: new Date().toISOString()
      }
    };
    
    const { data: aiResult, error: aiError } = await supabase
      .from('brief_edit_logs')
      .insert(aiRevisionLog)
      .select();
    
    if (aiError) {
      console.error('❌ Error creating AI revision log:', aiError);
      return;
    }
    
    console.log('✅ AI revision log created successfully!');
    console.log('📝 Log ID:', aiResult[0].id);
    
    console.log('\n🎉 Real user activity simulated!');
    console.log('📊 Created 2 real edit logs:');
    console.log('   - Manual user edit');
    console.log('   - AI revision');
    
    console.log('\n📋 Next steps:');
    console.log('   1. Go to Audit Logs page');
    console.log('   2. Refresh to see the new activity');
    console.log('   3. The page should now show dynamic content!');
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
  }
}

// Run the simulation
simulateUserEdit();
