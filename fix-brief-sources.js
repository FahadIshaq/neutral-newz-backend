const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixBriefSources() {
  console.log('🔧 Starting to fix brief source articles...');
  
  try {
    // First, let's check what's actually in the database
    console.log('🔍 Checking current briefs...');
    const { data: allBriefs, error: allBriefsError } = await supabase
      .from('news_briefs')
      .select('id, title, source_articles')
      .limit(5);
    
    if (!allBriefsError && allBriefs) {
      console.log('📋 Sample briefs from database:');
      for (const brief of allBriefs) {
        console.log(`  - "${brief.title}"`);
        console.log(`    source_articles: ${JSON.stringify(brief.source_articles)} (type: ${typeof brief.source_articles})`);
        
        // Check if these are article IDs and get the actual URLs
        if (brief.source_articles && brief.source_articles.length > 0) {
          const { data: articles, error: articlesError } = await supabase
            .from('news_articles')
            .select('id, url, title')
            .in('id', brief.source_articles);
          
          if (!articlesError && articles) {
            console.log(`    Actual URLs:`);
            articles.forEach(article => {
              console.log(`      - ${article.url}`);
            });
          }
        }
        console.log('');
      }
    }
    
    // Get all briefs with empty sourceArticles
    const { data: briefs, error: briefsError } = await supabase
      .from('news_briefs')
      .select('*')
      .or('source_articles.is.null,source_articles.eq.{}')
      .limit(50);
    
    if (briefsError) {
      console.error('Error fetching briefs:', briefsError);
      return;
    }
    
    if (!briefs || briefs.length === 0) {
      console.log('✅ No briefs need fixing - all have source articles');
      return;
    }
    
    console.log(`🔍 Found ${briefs.length} briefs with missing source articles`);
    
    let fixedCount = 0;
    
    for (const brief of briefs) {
      try {
        // Find articles that match this brief's category and were published around the same time
        const briefDate = new Date(brief.published_at);
        const startDate = new Date(briefDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
        const endDate = new Date(briefDate.getTime() + 24 * 60 * 60 * 1000);   // 24 hours after
        
        const { data: articles, error: articlesError } = await supabase
          .from('news_articles')
          .select('url, title, published_at')
          .eq('category', brief.category)
          .gte('published_at', startDate.toISOString())
          .lte('published_at', endDate.toISOString())
          .order('published_at', { ascending: false })
          .limit(3); // Get up to 3 most relevant articles
        
        if (articlesError) {
          console.error(`Error fetching articles for brief ${brief.id}:`, articlesError);
          continue;
        }
        
        if (articles && articles.length > 0) {
          // Update the brief with the actual article URLs
          const articleUrls = articles.map(article => article.url);
          
          const { error: updateError } = await supabase
            .from('news_briefs')
            .update({
              source_articles: articleUrls,
              updated_at: new Date().toISOString()
            })
            .eq('id', brief.id);
          
          if (updateError) {
            console.error(`Error updating brief ${brief.id}:`, updateError);
          } else {
            console.log(`✅ Fixed brief "${brief.title}" with ${articleUrls.length} source URLs:`);
            articleUrls.forEach(url => console.log(`   - ${url}`));
            fixedCount++;
          }
        } else {
          console.log(`⚠️ No matching articles found for brief "${brief.title}"`);
        }
      } catch (error) {
        console.error(`Error processing brief ${brief.id}:`, error);
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} out of ${briefs.length} briefs`);
    
    // Test the fix by checking a few briefs
    console.log('\n🔍 Testing the fix...');
    const { data: testBriefs, error: testError } = await supabase
      .from('news_briefs')
      .select('title, source_articles')
      .limit(3);
    
    if (!testError && testBriefs) {
      testBriefs.forEach(brief => {
        console.log(`📰 "${brief.title}"`);
        console.log(`   Sources: ${brief.source_articles?.length || 0} URLs`);
        if (brief.source_articles && brief.source_articles.length > 0) {
          brief.source_articles.forEach(url => console.log(`   - ${url}`));
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error in fixBriefSources:', error);
  }
}

fixBriefSources();
