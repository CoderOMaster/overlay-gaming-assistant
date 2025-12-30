import requests
import re
from typing import List, Dict, Optional
from urllib.parse import quote, urlparse
import time

from config import config

class WebSearcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def search_game_hints(self, query: str, game_name: Optional[str] = None) -> List[Dict[str, str]]:
        """Search for game hints and walkthroughs."""
        # Enhance query with gaming terms
        enhanced_query = query
        if game_name:
            enhanced_query = f"{game_name} {query}"
        
        # Add gaming-related terms if not present
        gaming_terms = ["guide", "walkthrough", "tips", "how to", "strategy"]
        if not any(term in query.lower() for term in gaming_terms):
            enhanced_query += " guide walkthrough tips"
        
        # Use DuckDuckGo for more privacy-friendly search
        return self._duckduckgo_search(enhanced_query)
    
    def _duckduckgo_search(self, query: str) -> List[Dict[str, str]]:
        """Perform search using DuckDuckGo."""
        try:
            # DuckDuckGo instant answer API
            url = "https://duckduckgo.com/html/"
            params = {
                'q': query,
                'kl': 'us-en'
            }
            
            response = self.session.get(url, params=params, timeout=config.SEARCH_TIMEOUT)
            response.raise_for_status()
            
            # Parse HTML results
            results = self._parse_duckduckgo_results(response.text)
            return results[:config.MAX_SEARCH_RESULTS]
            
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def _parse_duckduckgo_results(self, html: str) -> List[Dict[str, str]]:
        """Parse DuckDuckGo search results from HTML."""
        results = []
        
        # Simple regex parsing for results
        # Look for result links and titles
        result_pattern = r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)</a>'
        snippet_pattern = r'<a[^>]*class="result__a"[^>]*>.*?</a>.*?<a[^>]*class="result__snippet"[^>]*>([^<]*)</a>'
        
        result_matches = re.findall(result_pattern, html, re.DOTALL)
        
        for i, (url, title) in enumerate(result_matches[:config.MAX_SEARCH_RESULTS]):
            # Clean up the URL and title
            url = url.replace('/l/?uddg=', '').split('&')[0]
            title = re.sub(r'<[^>]*>', '', title).strip()
            
            if url and title and not url.startswith('/'):
                results.append({
                    'title': title,
                    'url': url,
                    'snippet': f"Search result: {title}"
                })
        
        return results
    
    def get_page_content(self, url: str) -> Optional[str]:
        """Get text content from a webpage."""
        try:
            response = self.session.get(url, timeout=config.SEARCH_TIMEOUT)
            response.raise_for_status()
            
            # Simple text extraction
            content = response.text
            
            # Remove HTML tags (basic)
            content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL)
            content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL)
            content = re.sub(r'<[^>]*>', ' ', content)
            content = re.sub(r'\s+', ' ', content)
            
            # Return first 2000 characters
            return content[:2000].strip()
            
        except Exception as e:
            print(f"Error fetching page content: {e}")
            return None
    
    def search_specific_game_guide(self, game_name: str, specific_query: str) -> Optional[str]:
        """Search for specific game guide and extract relevant information."""
        query = f"{game_name} {specific_query} guide walkthrough"
        results = self.search_game_hints(query, game_name)
        
        if not results:
            return None
        
        # Try to get content from the first few results
        for result in results[:3]:
            content = self.get_page_content(result['url'])
            if content:
                # Simple relevance check
                if any(term in content.lower() for term in specific_query.lower().split()):
                    return f"From {result['title']}: {content[:500]}..."
        
        return f"Found relevant guides: {', '.join([r['title'] for r in results[:3]])}"
