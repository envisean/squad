import { SalesProspectingAgent } from '@squad/agents';
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from './utils/env';
import { ProspectSchema } from '@squad/agents';
import type { z } from 'zod';

// Load environment variables
loadEnv();

async function testProspecting() {
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

  // Initialize agent with config
  const agent = new SalesProspectingAgent({
    searchCriteria: {
      industries: ['real estate', 'property management'],
      roles: ['CTO', 'VP Engineering', 'Technical Lead'],
      companySize: ['50-200', '201-500'],
      location: ['Seattle', 'San Francisco']
    },
    enrichment: {
      useLinkedIn: true,
      useClearbit: false,
      useApollo: false
    },
    scoring: {
      minScore: 0.6,
      weights: {
        roleMatch: 0.4,
        industryMatch: 0.3,
        companySizeMatch: 0.2,
        locationMatch: 0.1
      }
    }
  });

  // Run the agent
  const result = await agent.processTask({
    type: 'prospect-search',
    id: 'test-1',
    input: {
      query: 'Find technical leaders in real estate companies',
      vectorStore,
      outputProcessor: async (prospects: Array<z.infer<typeof ProspectSchema>>) => {
        console.log('\nFound Prospects:');
        prospects.forEach((prospect, index) => {
          console.log(`\n${index + 1}. ${prospect.name}`);
          console.log(`   Title: ${prospect.title}`);
          console.log(`   Company: ${prospect.company}`);
          console.log(`   Score: ${prospect.score?.toFixed(2)}`);
          if (prospect.linkedin_url) console.log(`   LinkedIn: ${prospect.linkedin_url}`);
        });
      }
    }
  });

  console.log('\nTask Result:', result);
}

testProspecting().catch(console.error); 