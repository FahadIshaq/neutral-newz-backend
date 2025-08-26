#!/usr/bin/env node
require('dotenv').config();

async function testAIIntegration() {
  console.log('🤖 Testing AI Service Integration...\n');
  
  try {
    // Test OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    console.log('✅ OpenAI API key found');
    
    // Test AI service initialization
    const { AIService } = require('./dist/services/aiService');
    const aiService = new AIService();
    console.log('✅ AI Service initialized successfully');
    
    // Test with sample data
    const testArticles = [{
      id: 'test-1',
      title: 'Federal Reserve announces interest rate decision',
      description: 'The Federal Reserve announced today that it will maintain the current federal funds rate at 5.25-5.50 percent. This decision comes after recent economic data showed inflation moderating while employment remains strong. The Fed\'s policy statement indicates a cautious approach to future rate changes.',
      content: 'The Federal Reserve announced today that it will maintain the current federal funds rate at 5.25-5.50 percent. This decision comes after recent economic data showed inflation moderating while employment remains strong. The Fed\'s policy statement indicates a cautious approach to future rate changes.',
      url: 'https://www.federalreserve.gov/news-events/press-releases/monetary20231213a.htm',
      source: 'Federal Reserve',
      category: 'US_NATIONAL',
      publishedAt: new Date(),
      processedAt: new Date(),
      briefGenerated: false,
      tags: ['economy', 'federal-reserve', 'interest-rates']
    }];
    
    console.log('📰 Testing AI brief generation...');
    const result = await aiService.generateBrief(testArticles);
    
    console.log('✅ AI brief generation successful!');
    console.log('Title:', result.brief.title);
    console.log('Summary length:', result.brief.summary.length, 'characters');
    console.log('Tokens used:', result.tokensUsed);
    console.log('Cost:', '$' + result.costUsd.toFixed(6));
    console.log('Model version:', result.brief.llmMetadata?.modelVersion);
    console.log('Prompt version:', result.brief.llmMetadata?.promptVersion);
    
    console.log('\n🎉 AI integration test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure OPENAI_API_KEY is set in .env file');
    console.error('2. Verify the backend has been built (npm run build)');
    console.error('3. Check if OpenAI API is accessible');
  }
}

testAIIntegration();
