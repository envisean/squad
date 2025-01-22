import { FireCrawlLoader } from "@langchain/community/document_loaders/web/firecrawl";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { SingleBar, Presets } from 'cli-progress';
import { z } from 'zod';
import { Tool } from '../../registry/tool-registry';

// Define schemas according to CODEX.md guidelines
const WebsiteIngestionConfigSchema = z.object({
  maxPages: z.number().default(100),
  waitTime: z.number().default(5000),
  timeout: z.number().default(60000),
  chunkSize: z.number().default(500),
  chunkOverlap: z.number().default(50),
  batchSize: z.number().default(20)
});

const WebsiteIngestionInputSchema = z.object({
  url: z.string().url(),
  config: WebsiteIngestionConfigSchema.optional()
});

interface ProcessedDoc extends Document {
  pageContent: string;
}

export class WebsiteIngestionTool implements Tool {
  name = 'website-ingestion';
  description = 'Crawl and ingest website content into vector store';
  category = 'data-processing';
  capabilities = ['web-crawling', 'vector-storage'];

  private config: z.infer<typeof WebsiteIngestionConfigSchema>;
  
  constructor(config?: z.infer<typeof WebsiteIngestionConfigSchema>) {
    this.config = WebsiteIngestionConfigSchema.parse(config ?? {});
  }

  async validateInput(input: unknown): Promise<boolean> {
    return WebsiteIngestionInputSchema.safeParse(input).success;
  }

  async process(input: z.infer<typeof WebsiteIngestionInputSchema>) {
    const { url } = input;
    const config = input.config ?? this.config;

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    try {
      console.log(`\nStarting ingestion for ${url}...`);
      console.log(`Configuration:`);
      console.log(`- Max pages: ${config.maxPages}`);
      console.log(`- Chunk size: ${config.chunkSize}`);
      console.log(`- Batch size: ${config.batchSize}\n`);
      
      const startTime = Date.now();
      console.log('Initializing crawler...');
      
      const loader = new FireCrawlLoader({
        url,
        apiKey: firecrawlApiKey,
        mode: "crawl",
        params: {
          limit: config.maxPages,
          scrapeOptions: {
            formats: ["markdown", "html"]
          }
        }
      });

      console.log('Starting website crawl...');
      console.log('This may take a few minutes depending on the site size and rate limits.');
      console.log('Waiting for first page...');

      // Create a timer to show we're still alive
      const loadingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\rCrawling... (${elapsed}s elapsed)`);
      }, 1000);

      const rawDocs = await loader.load();
      
      // Clear the loading timer
      clearInterval(loadingInterval);
      process.stdout.write('\n'); // New line after loading dots

      const crawlTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\nCrawl complete in ${crawlTime}s`);
      console.log(`Found ${rawDocs.length} pages to process`);

      if (rawDocs.length === 0) {
        throw new Error('No pages were crawled. Please check the URL and try again.');
      }

      // Log the first few URLs that were crawled
      console.log('\nFirst few pages crawled:');
      rawDocs.slice(0, 3).forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.metadata.source || 'Unknown URL'}`);
      });
      if (rawDocs.length > 3) {
        console.log(`... and ${rawDocs.length - 3} more pages`);
      }

      const docs = rawDocs.map(doc => ({
        ...doc,
        pageContent: doc.pageContent.toString()
      })) as ProcessedDoc[];

      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
      });

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap
      });

      let totalChunks = 0;
      let processedDocs = 0;
      const totalBatches = Math.ceil(docs.length / config.batchSize);

      // Create progress bar
      const progressBar = new SingleBar({
        format: 'Processing Batches |{bar}| {percentage}% | {value}/{total} Batches | Chunks: {chunks}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
      }, Presets.shades_classic);

      console.log('\nProcessing documents in batches:');
      progressBar.start(totalBatches, 0, { chunks: 0 });

      // Process documents in batches
      for (let i = 0; i < docs.length; i += config.batchSize) {
        const batch = docs.slice(i, i + config.batchSize);
        const splitBatch = await textSplitter.splitDocuments(batch);

        await SupabaseVectorStore.fromDocuments(
          splitBatch,
          embeddings,
          {
            client,
            tableName: "documents",
            queryName: "match_documents"
          }
        );

        totalChunks += splitBatch.length;
        processedDocs += batch.length;

        // Update progress bar
        progressBar.update(Math.floor(i / config.batchSize) + 1, {
          chunks: totalChunks
        });

        // Optional: Add a small delay between batches to avoid rate limits
        if (i + config.batchSize < docs.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      progressBar.stop();

      const stats = {
        pagesProcessed: processedDocs,
        chunksStored: totalChunks,
        averageChunksPerPage: totalChunks / processedDocs
      };

      console.log('\nIngestion complete! Summary:');
      console.log(`- Pages processed: ${stats.pagesProcessed}`);
      console.log(`- Total chunks stored: ${stats.chunksStored}`);
      console.log(`- Average chunks per page: ${stats.averageChunksPerPage.toFixed(2)}`);

      return stats;

    } catch (error) {
      console.error("\nError ingesting website:", error);
      throw error;
    }
  }
} 