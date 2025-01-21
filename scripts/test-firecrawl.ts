import { FireCrawl } from '../packages/agents/src/tools/firecrawl';
import { config } from 'dotenv';

// Load environment variables
config();

async function testFireCrawl() {
  const crawler = new FireCrawl({
    apiKey: 'fc-6a655be4d52248a79a23b9dd7499fa11'
  });

  try {
    console.log('Crawling concreit.com...');
    const result = await crawler.crawl('https://concreit.com');
    
    console.log('\nCrawl Results:');
    console.log('Title:', result.title);
    console.log('Content Length:', result.content.length);
    console.log('Links Found:', result.links.length);
    console.log('\nFirst 500 chars of content:');
    console.log(result.content.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFireCrawl();