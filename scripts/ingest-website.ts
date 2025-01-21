import { FireCrawlLoader } from "langchain/document_loaders/web/firecrawl";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config();

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

async function ingestWebsite(url: string) {
  try {
    console.log(`Loading content from ${url}...`);
    
    // Initialize FireCrawl loader
    const loader = new FireCrawlLoader({
      url,
      apiKey: process.env.FIRECRAWL_API_KEY,
      mode: "crawl",  // Crawl all accessible subpages
      params: {
        limit: 100,  // Limit to 100 pages for now
        waitFor: 5000,  // Wait 5s for content to load
        timeout: 60000,  // 60s timeout
        onlyMainContent: true
      }
    });

    // Load documents
    const rawDocs = await loader.load();
    console.log(`Loaded ${rawDocs.length} documents`);

    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP
    });
    
    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log(`Split into ${docs.length} chunks`);

    // Initialize Supabase client
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize vector store
    const vectorStore = await SupabaseVectorStore.fromDocuments(
      docs,
      new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
      }),
      {
        client,
        tableName: "documents",
        queryName: "match_documents"
      }
    );

    console.log('Content successfully loaded into vector store!');
    
    // Return some stats
    return {
      url,
      pagesProcessed: rawDocs.length,
      chunksStored: docs.length,
      averageChunkSize: docs.reduce((acc, doc) => acc + doc.pageContent.length, 0) / docs.length
    };

  } catch (error) {
    console.error('Error ingesting website:', error);
    throw error;
  }
}

// Test the ingestion
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL to ingest');
    process.exit(1);
  }

  try {
    const stats = await ingestWebsite(url);
    console.log('\nIngestion Stats:');
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Failed to ingest website:', error);
    process.exit(1);
  }
}

main();