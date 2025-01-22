import { serve } from "http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { SalesProspectingAgent } from "./dist/index.js";
import { SupabaseVectorStore } from "npm:@langchain/community@0.3.26/vectorstores/supabase";
import { OpenAIEmbeddings } from "npm:@langchain/openai@0.3.17/embeddings";

interface RequestBody {
  query: string;
  config?: {
    searchCriteria?: {
      industries?: string[];
      roles?: string[];
      companySize?: string[];
      location?: string[];
    };
    enrichment?: {
      useLinkedIn?: boolean;
      useClearbit?: boolean;
      useApollo?: boolean;
    };
    scoring?: {
      minScore?: number;
      weights?: {
        roleMatch?: number;
        industryMatch?: number;
        companySizeMatch?: number;
        locationMatch?: number;
      };
    };
  };
}

serve(async (req: Request) => {
  try {
    const { query, config } = await req.json() as RequestBody;

    // Initialize Supabase client
    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize vector store
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: Deno.env.get('OPENAI_API_KEY')
    });

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: "documents",
      queryName: "match_documents"
    });

    // Initialize agent with default config
    const agent = new SalesProspectingAgent({
      searchCriteria: {
        industries: config?.searchCriteria?.industries ?? [],
        roles: config?.searchCriteria?.roles ?? [],
        companySize: config?.searchCriteria?.companySize ?? [],
        location: config?.searchCriteria?.location ?? []
      },
      enrichment: {
        useLinkedIn: config?.enrichment?.useLinkedIn ?? true,
        useClearbit: config?.enrichment?.useClearbit ?? false,
        useApollo: config?.enrichment?.useApollo ?? false
      },
      scoring: {
        minScore: config?.scoring?.minScore ?? 0.6,
        weights: {
          roleMatch: config?.scoring?.weights?.roleMatch ?? 0.4,
          industryMatch: config?.scoring?.weights?.industryMatch ?? 0.3,
          companySizeMatch: config?.scoring?.weights?.companySizeMatch ?? 0.2,
          locationMatch: config?.scoring?.weights?.locationMatch ?? 0.1
        }
      }
    });

    // Run the agent
    const result = await agent.processTask({
      type: 'prospect-search',
      id: crypto.randomUUID(),
      input: {
        query,
        vectorStore
      }
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 