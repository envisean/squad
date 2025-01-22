import { WebsiteIngestionTool } from '@squad/agents';
import { Command } from 'commander';
import { loadEnv } from './utils/env';

// Load environment variables
loadEnv();

interface CommandOptions {
  maxPages: string;
  waitTime: string;
  timeout: string;
  chunkSize: string;
  chunkOverlap: string;
  batchSize: string;
}

const program = new Command();

program
  .argument('<url>', 'Website URL to ingest')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl', '100')
  .option('-w, --wait-time <number>', 'Wait time per page (ms)', '5000')
  .option('-t, --timeout <number>', 'Timeout (ms)', '60000')
  .option('-c, --chunk-size <number>', 'Size of text chunks', '500')
  .option('-o, --chunk-overlap <number>', 'Overlap between chunks', '50')
  .option('-b, --batch-size <number>', 'Number of chunks per batch', '20')
  .action(async (url: string, options: CommandOptions) => {
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
      console.log("\nIngestion Stats:");
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Failed to ingest website:", error);
      process.exit(1);
    }
  });

program.parse();
