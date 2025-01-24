declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined
  }
  export const env: Env
}

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(handler: (req: Request) => Promise<Response>): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2.39.0' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@langchain/community@0.3.26/vectorstores/supabase' {
  export * from '@langchain/community/vectorstores/supabase'
}

declare module 'https://esm.sh/@langchain/openai@0.3.0' {
  export * from '@langchain/openai'
}
