import Conf from 'conf';

export const config = new Conf({
  projectName: 'squad',
  schema: {
    supabaseUrl: {
      type: 'string',
      default: process.env.SUPABASE_URL
    },
    supabaseKey: {
      type: 'string',
      default: process.env.SUPABASE_KEY
    },
    openaiKey: {
      type: 'string',
      default: process.env.OPENAI_API_KEY
    },
    defaultModel: {
      type: 'string',
      default: 'gpt-4'
    },
    logLevel: {
      type: 'string',
      default: 'info'
    }
  }
});