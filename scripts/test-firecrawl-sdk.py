from firecrawl import FirecrawlApp
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def test_firecrawl():
    try:
        # Initialize FirecrawlApp with API key
        app = FirecrawlApp(api_key="fc-6a655be4d52248a79a23b9dd7499fa11")

        # Scrape a single URL first
        print("Scraping concreit.com...")
        scrape_result = app.scrape_url(
            'https://concreit.com',
            params={'formats': ['markdown', 'html']}
        )
        
        print("\nScrape Results:")
        print("Title:", scrape_result.get('metadata', {}).get('title'))
        print("Content Length:", len(scrape_result.get('markdown', '')))
        print("\nFirst 500 chars of markdown:")
        print(scrape_result.get('markdown', '')[:500])

        # Now let's try crawling
        print("\nStarting crawl of concreit.com...")
        crawl_status = app.crawl_url(
            'https://concreit.com',
            params={
                'limit': 10,  # Limit to 10 pages for testing
                'scrapeOptions': {'formats': ['markdown']}
            },
            poll_interval=30  # Check status every 30 seconds
        )
        
        print("\nCrawl Results:")
        print("Total Pages:", crawl_status.get('total'))
        print("Completed Pages:", crawl_status.get('completed'))
        print("Credits Used:", crawl_status.get('creditsUsed'))
        
        if crawl_status.get('data'):
            print("\nFirst page content:")
            first_page = crawl_status['data'][0]
            print("URL:", first_page.get('metadata', {}).get('sourceURL'))
            print("Title:", first_page.get('metadata', {}).get('title'))
            print("Content Preview:", first_page.get('markdown', '')[:200])

    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test_firecrawl()