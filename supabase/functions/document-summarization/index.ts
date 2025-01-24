// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// @deno-types="npm:@types/node"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { DocumentSummarizationAgent } from './dist/index.mjs'
import { corsHeaders } from '../_shared/cors.ts'
import { z } from 'zod'

// Define input schema
const DocumentSummarizationInputSchema = z.object({
  document: z.object({
    content: z.string(),
    metadata: z.object({
      type: z.enum(['markdown', 'text', 'html']),
      title: z.string().optional(),
      author: z.string().optional(),
      date: z.string().optional(),
    }),
  }),
  options: z.object({
    summaryType: z.enum(['brief', 'detailed', 'comprehensive']),
    preserveStructure: z.boolean(),
    maxLength: z.number().optional(),
    format: z.enum(['markdown', 'text', 'json']).optional(),
  }),
})

console.log('Document Summarization Agent initialized!')

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`${req.method} not allowed`)
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedInput = DocumentSummarizationInputSchema.parse(body)

    // Initialize agent
    console.log('Initializing Document Summarization Agent...')
    const agent = new DocumentSummarizationAgent({
      openAIApiKey: Deno.env.get('OPENAI_API_KEY')
    })

    // Create task
    const task = {
      id: crypto.randomUUID(),
      type: 'document-summarization',
      input: validatedInput
    }

    // Process task
    const result = await agent.processTask(task)

    // Return result
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/document-summarization' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "document": {
        "content": "Your document content here",
        "metadata": { "source": "example" }
      },
      "options": {
        "summaryType": "brief",
        "format": "text"
      }
    }'

*/
