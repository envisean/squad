import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from './utils/env';

// Load environment variables
loadEnv();

interface VectorDocument {
  id: number;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

interface RpcParams {
  query_embedding: number[];
  match_count: number;
}

async function testSearch(query: string) {
  const client: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY
  });
  
  const queryEmbedding = await embeddings.embedQuery(query) as number[];
  
  const { data: documents, error } = await client.rpc(
    'match_documents',
    {
      query_embedding: queryEmbedding,
      match_count: 5
    } as RpcParams
  );

  if (error || !documents) {
    console.error('Search failed:', error);
    return;
  }

  console.log(`\nSearch results for: "${query}"\n`);
  if (Array.isArray(documents)) {
    documents.forEach((doc: VectorDocument) => {
      console.log(`${doc.id}. Similarity: ${doc.similarity.toFixed(3)}`);
      console.log(`Content: ${doc.content.substring(0, 200)}...\n`);
    });
  } else {
    console.log('No documents found');
  }
}

const query = process.argv[2] || 'default search query';
testSearch(query); 