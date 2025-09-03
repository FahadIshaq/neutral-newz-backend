const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function convertIdsToUrls() {
  console.log('🔧 Converting article IDs to URLs in briefs...');
  
  try {
    // Get all briefs that have source_articles
    const { data: briefs, error: briefsError } = await supabase
      .from('news_briefs')
      .select('id, title, source_articles')
      .not('source_articles', 'is', null)
      .limit(100);
    
    if (briefsError) {
      console.error('Error fetching briefs:', briefsError);
      return;
    }
    
    if (!briefs || briefs.length === 0) {
      console.log('✅ No briefs found');
      return;
    }
    
    console.log(`🔍 Found ${briefs.length} briefs to process`);
    
    let fixedCount = 0;
    
    for (const brief of briefs) {
      try {
        if (!brief.source_articles || brief.source_articles.length === 0) {
          continue;
        }
        
        // Check if these look like article IDs (not URLs)
        const firstItem = brief.source_articles[0];
        if (firstItem && firstItem.startsWith('http')) {
          // Already URLs, skip
          continue;
        }
        
        // Get the actual URLs for these article IDs
        const { data: articles, error: articlesError } = await supabase
          .from('news_articles')
          .select('id, url')
          .in('id', brief.source_articles);
        
        if (articlesError) {
          console.error(`Error fetching articles for brief ${brief.id}:`, articlesError);
          continue;
        }
        
        if (articles && articles.length > 0) {
          // Convert article IDs to URLs
          const articleUrls = articles.map(article => article.url);
          
          // Update the brief with the actual URLs
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
            console.log(`✅ Fixed brief "${brief.title.substring(0, 60)}..."`);
            console.log(`   Converted ${brief.source_articles.length} IDs to URLs`);
            fixedCount++;
          }
        } else {
          console.log(`⚠️ No articles found for brief "${brief.title.substring(0, 60)}..."`);
        }
      } catch (error) {
        console.error(`Error processing brief ${brief.id}:`, error);
      }
    }
    
    console.log(`🎉 Converted ${fixedCount} out of ${briefs.length} briefs from IDs to URLs`);
    
    // Test the fix
    console.log('\n🔍 Testing the fix...');
    const { data: testBriefs, error: testError } = await supabase
      .from('news_briefs')
      .select('title, source_articles')
      .limit(3);
    
    if (!testError && testBriefs) {
      testBriefs.forEach(brief => {
        console.log(`📰 "${brief.title.substring(0, 50)}..."`);
        if (brief.source_articles && brief.source_articles.length > 0) {
          brief.source_articles.forEach(url => {
            if (url.startsWith('http')) {
              console.log(`   ✅ ${url}`);
            } else {
              console.log(`   ❌ ${url} (still an ID)`);
            }
          });
        } else {
          console.log(`   ❌ No source articles`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error in convertIdsToUrls:', error);
  }
}

convertIdsToUrls();
