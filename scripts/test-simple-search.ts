import { SimpleSearchAgent } from '@squad/agents/search-agents/simple-search';
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from './utils/env';

// Load environment variables
loadEnv();

async function testSearch() {
  // Initialize vector store
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client,
    tableName: "documents",
    queryName: "match_documents"
  });

  // Initialize agent
  const agent = new SimpleSearchAgent();

  // Get query from command line or use default
  const query = process.argv[2] || "What are the key features of the product?";
  console.log(`\nSearching for: "${query}"\n`);

  // Run the agent
  const result = await agent.processTask({
    type: 'simple-search',
    id: 'test-1',
    input: {
      query,
      vectorStore
    }
  });

  if (result.status === 'success' && result.data) {
    console.log('Answer:', result.data.answer);
    console.log('\nSource Documents:');
    result.data.sourceDocs.forEach((doc, i) => {
      console.log(`\n[${i + 1}] ${doc.content.substring(0, 200)}...`);
    });
  } else {
    console.error('Search failed:', result.error);
  }
}

testSearch().catch(console.error); 