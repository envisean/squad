# Document Summarization Agent Development

Date: 2025-01-23

## Requirements

### Problem Statement

We need a specialized agent that can take long documents and create high-quality, hierarchical summaries with different levels of detail. This will extend our current SimpleSearchAgent capabilities but focus on comprehensive document understanding and structured summarization.

### Constraints

- Must handle documents of varying lengths efficiently
- Should preserve document structure (sections, subsections)
- Must provide multiple summary levels (brief, detailed, comprehensive)
- Should handle different document types (markdown, text, etc.)
- Must integrate with existing vector store infrastructure

### Expected Inputs/Outputs

```typescript
// Input schema
interface SummarizationInput {
  document: {
    content: string
    metadata: {
      type: 'markdown' | 'text' | 'html'
      title?: string
      author?: string
      date?: string
    }
  }
  options: {
    summaryType: 'brief' | 'detailed' | 'comprehensive'
    preserveStructure: boolean
    maxLength?: number
    format?: 'markdown' | 'text' | 'json'
  }
}

// Output schema
interface SummarizationOutput {
  summary: {
    brief: string
    detailed?: {
      overview: string
      sections: Array<{
        title: string
        content: string
        subsections?: Array<{
          title: string
          content: string
        }>
      }>
    }
    keyPoints: string[]
    metadata: {
      originalLength: number
      summaryLength: number
      compressionRatio: number
      processingTime: number
    }
  }
}
```

## Development Log

### 1. Initial Planning

**Milestones:**

1. Set up basic agent structure and types
2. Implement document parsing and structure analysis
3. Develop summarization logic with LLM integration
4. Add hierarchical summary generation
5. Implement output formatting and validation
6. Add tests and documentation

**Questions/Clarifications:**

- [ ] Should we support additional document types beyond markdown/text/html?
- [ ] Do we need to implement caching for repeated summarizations?
- [ ] Should we integrate with external summarization APIs for comparison?
- [ ] How should we handle documents that exceed token limits?

Would you like me to proceed with implementing any specific milestone?

### 7. Edge Function Deployment

**Status: ✅ Completed**

The document summarization agent has been successfully deployed as an edge function.

**API Documentation:**

```typescript
// Request Schema
interface DocumentSummarizationRequest {
  document: {
    content: string;
    metadata: {
      type: 'markdown' | 'text' | 'html';
      title?: string;
      author?: string;
      date?: string;
    };
  };
  options: {
    summaryType: 'brief' | 'detailed' | 'comprehensive';
    preserveStructure: boolean;
    maxLength?: number;
    format?: 'markdown' | 'text' | 'json';
  };
}

// Example Usage
curl -X POST "https://etziwqjmkwuqntcmqadz.supabase.co/functions/v1/document-summarization" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "document": {
      "content": "# Your Document\n\nContent here...",
      "metadata": {
        "type": "markdown",
        "title": "Example Document"
      }
    },
    "options": {
      "summaryType": "brief",
      "preserveStructure": false,
      "format": "text"
    }
  }'

// Response Schema
interface DocumentSummarizationResponse {
  summary: {
    brief: string;
    detailed?: {
      overview: string;
      sections: Array<{
        title: string;
        content: string;
        subsections?: Array<{
          title: string;
          content: string;
        }>;
      }>;
    };
    keyPoints: string[];
    metadata: {
      originalLength: number;
      summaryLength: number;
      compressionRatio: number;
      processingTime: number;
    };
  };
}
```

**Monitoring Setup:**

1. **Metrics Tracked:**

   ```sql
   -- Agent metrics table
   CREATE TABLE IF NOT EXISTS agent_metrics (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id UUID REFERENCES agents(id),
     metric_name TEXT NOT NULL,
     metric_value DOUBLE PRECISION NOT NULL,
     timestamp TIMESTAMPTZ DEFAULT now()
   );

   -- Document summarization specific metrics
   INSERT INTO agent_metrics (agent_id, metric_name, metric_value) VALUES
     (:agent_id, 'document_length', :length),
     (:agent_id, 'processing_time_ms', :time),
     (:agent_id, 'compression_ratio', :ratio),
     (:agent_id, 'token_usage', :tokens);
   ```

2. **Logging:**

   ```typescript
   // Log levels
   const LOG_LEVELS = {
     DEBUG: 'debug',
     INFO: 'info',
     WARN: 'warn',
     ERROR: 'error'
   };

   // Example log entries
   {
     level: 'info',
     message: 'Document summarization started',
     metadata: {
       documentId: string,
       documentType: string,
       summaryType: string
     }
   }
   ```

3. **Alerts:**
   - High latency (> 10s)
   - Error rate > 5%
   - Token usage spikes
   - Invalid input patterns

**Integration Examples:**

1. **Node.js Client:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function summarizeDocument(content: string) {
  const { data, error } = await supabase.functions.invoke('document-summarization', {
    body: {
      document: {
        content,
        metadata: { type: 'markdown' },
      },
      options: {
        summaryType: 'brief',
        preserveStructure: false,
      },
    },
  })

  if (error) throw error
  return data
}
```

2. **Python Client:**

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def summarize_document(content: str):
    response = supabase.functions.invoke(
        'document-summarization',
        invoke_options={
            'document': {
                'content': content,
                'metadata': {'type': 'markdown'}
            },
            'options': {
                'summaryType': 'brief',
                'preserveStructure': False
            }
        }
    )
    return response.data
```

**Next Steps:**

1. [ ] Add rate limiting
2. [ ] Implement caching for identical documents
3. [ ] Add support for batch processing
4. [ ] Create dashboard for monitoring
5. [ ] Document integration patterns with other agents
