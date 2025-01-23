import { WebsiteIngestionTool } from '@squad/agents/tools/website-ingestion';
import { Command } from 'commander';

export const ingestWebsiteCommand = new Command()
  .name('ingest-website')
  .description('Crawl and ingest website content into vector store')
  .argument('<url>', 'Website URL to ingest')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl', '100')
  .option('-w, --wait-time <number>', 'Wait time per page (ms)', '5000')
  .option('-t, --timeout <number>', 'Timeout (ms)', '60000')
  .option('-c, --chunk-size <number>', 'Size of text chunks', '500')
  .option('-o, --chunk-overlap <number>', 'Overlap between chunks', '50')
  .option('-b, --batch-size <number>', 'Number of chunks per batch', '20')
  .action(async (url, options) => {
    const tool = new WebsiteIngestionTool({
      maxPages: parseInt(options.maxPages),
      waitTime: parseInt(options.waitTime),
      timeout: parseInt(options.timeout),
      chunkSize: parseInt(options.chunkSize),
      chunkOverlap: parseInt(options.chunkOverlap),
      batchSize: parseInt(options.batchSize)
    });

    try {
      const result = await tool.process({ url });
      console.log('Ingestion complete:', result);
    } catch (error) {
      console.error('Ingestion failed:', error);
      process.exit(1);
    }
  }); 