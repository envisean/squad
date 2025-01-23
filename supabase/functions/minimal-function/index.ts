// minimal_function.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SupabaseVectorStore } from "npm:langchain/vectorstores/supabase";

serve(() => new Response("Hello from minimal!"));