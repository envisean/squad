import axios from 'axios';

export interface FireCrawlConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  metadata: {
    [key: string]: any;
  };
}

export class FireCrawl {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: FireCrawlConfig) {
    this.baseUrl = config.baseUrl || 'https://api.firecrawl.dev';
    this.apiKey = config.apiKey;
  }

  async crawl(url: string): Promise<CrawlResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/crawl`,
        { url },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('FireCrawl error:', error);
      throw new Error(`Failed to crawl ${url}: ${error.message}`);
    }
  }
}