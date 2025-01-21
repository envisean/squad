import FirecrawlApp from '@mendable/firecrawl-js';

export interface FireCrawlConfig {
  apiKey: string;
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
  private app: any;  // Type will be FirecrawlApp

  constructor(config: FireCrawlConfig) {
    this.app = new FirecrawlApp({ apiKey: config.apiKey });
  }

  async crawl(url: string): Promise<CrawlResult[]> {
    try {
      // Start a crawl with a limit of 100 pages
      const response = await this.app.crawlUrl(url, {
        limit: 100,
        scrapeOptions: {
          formats: ['markdown', 'html']
        }
      });

      if (!response.success) {
        throw new Error(`Failed to crawl ${url}: ${response.error}`);
      }

      // Transform the response into our CrawlResult format
      return response.data.map((page: any) => ({
        url: page.metadata.sourceURL,
        title: page.metadata.title || '',
        content: page.markdown || '',
        links: page.metadata.links || [],
        metadata: page.metadata
      }));

    } catch (error) {
      console.error('FireCrawl error:', error);
      throw error;
    }
  }

  async scrape(url: string): Promise<CrawlResult> {
    try {
      const response = await this.app.scrapeUrl(url, {
        formats: ['markdown', 'html']
      });

      if (!response.success) {
        throw new Error(`Failed to scrape ${url}: ${response.error}`);
      }

      return {
        url: response.data.metadata.sourceURL,
        title: response.data.metadata.title || '',
        content: response.data.markdown || '',
        links: response.data.metadata.links || [],
        metadata: response.data.metadata
      };

    } catch (error) {
      console.error('FireCrawl error:', error);
      throw error;
    }
  }
}