import { FireCrawl } from '../packages/agents/src/tools/firecrawl';
import { config } from 'dotenv';

// Load environment variables
config();

async function testFireCrawl() {
  const crawler = new FireCrawl({
    apiKey: 'fc-6a655be4d52248a79a23b9dd7499fa11'
  });

  try {
    // Test single page scraping first
    console.log('Scraping example.com...');
    const result = await crawler.scrape('https://example.com');
    
    console.log('\nScrape Results:');
    console.log('Title:', result.title);
    console.log('Content Length:', result.content.length);
    console.log('\nFirst 500 chars of content:');
    console.log(result.content.substring(0, 500));

    // Test crawling
    console.log('\nCrawling firecrawl.dev docs...');
    const crawlResults = await crawler.crawl('https://docs.firecrawl.dev');
    
    console.log('\nCrawl Results:');
    console.log('Pages Found:', crawlResults.length);
    
    if (crawlResults.length > 0) {
      console.log('\nFirst page:');
      console.log('URL:', crawlResults[0].url);
      console.log('Title:', crawlResults[0].title);
      console.log('Content Preview:', crawlResults[0].content.substring(0, 200));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFireCrawl();
