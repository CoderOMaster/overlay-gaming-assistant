from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time
import os
import sys
from typing import Optional

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config
from screenshot_manager import ScreenshotManager
from llm_processor import LLMProcessor
from web_searcher import WebSearcher

class BackendServer:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        
        # Initialize components
        self.screenshot_manager = ScreenshotManager()
        self.llm_processor = None
        self.web_searcher = WebSearcher()
        self.current_game = None
        
        # Try to initialize LLM processor
        try:
            self.llm_processor = LLMProcessor()
            print("✅ LLM processor initialized successfully")
        except ValueError as e:
            print(f"⚠️  LLM processor disabled: {e}")
        
        # Start screenshot capture
        self.screenshot_manager.start_continuous_capture()
        
        # Setup routes
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/health', methods=['GET'])
        def health_check():
            return jsonify({'status': 'healthy', 'llm_enabled': self.llm_processor is not None})
        
        @self.app.route('/query', methods=['POST'])
        def handle_query():
            try:
                data = request.get_json()
                query = data.get('query', '').strip()
                
                if not query:
                    return jsonify({'error': 'Empty query'}), 400
                
                print(f"Processing query: {query}")
                
                # Get latest screenshot for context
                screenshot_path = self.screenshot_manager.get_screenshot_for_analysis()
                
                response = None
                
                # Try LLM analysis with screenshot first
                if self.llm_processor and screenshot_path:
                    print("🤖 Analyzing with AI...")
                    response = self.llm_processor.analyze_screenshot(screenshot_path, query)
                
                # If screenshot analysis fails or no LLM, try web search
                if not response:
                    print("🔍 Searching web...")
                    search_results = self.web_searcher.search_game_hints(query, self.current_game)
                    
                    if search_results:
                        # Get content from first result
                        content = self.web_searcher.get_page_content(search_results[0]['url'])
                        if content:
                            response = f"Found helpful information:\n\n{content[:800]}..."
                        else:
                            response = f"Found these resources:\n" + "\n".join([f"• {r['title']}" for r in search_results[:3]])
                    else:
                        response = "Sorry, I couldn't find specific information for your query. Try rephrasing your question."
                
                # Fallback to text-only LLM if available
                if not response and self.llm_processor:
                    response = self.llm_processor.process_text_query(query, self.current_game)
                
                if not response:
                    response = "I'm unable to process your request right now. Please check your internet connection and API keys."
                
                return jsonify({'response': response})
                
            except Exception as e:
                print(f"❌ Query processing error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/screenshot', methods=['POST'])
        def handle_screenshot():
            try:
                screenshot_path = self.screenshot_manager.take_screenshot()
                if screenshot_path:
                    print("📸 Screenshot captured successfully")
                    
                    # Auto-analyze if LLM is available
                    if self.llm_processor:
                        print("🤖 Auto-analyzing screenshot...")
                        threading.Thread(
                            target=self._auto_analyze_screenshot,
                            args=(screenshot_path,),
                            daemon=True
                        ).start()
                    else:
                        print("⚠️  LLM not available - set OPENAI_API_KEY to enable AI analysis")
                    
                    return jsonify({'message': 'Screenshot captured successfully'})
                else:
                    return jsonify({'error': 'Failed to capture screenshot'}), 500
                    
            except Exception as e:
                print(f"❌ Screenshot error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/status', methods=['GET'])
        def get_status():
            return jsonify({
                'screenshot_count': len(self.screenshot_manager.screenshots),
                'llm_enabled': self.llm_processor is not None,
                'current_game': self.current_game,
                'capturing': self.screenshot_manager.is_capturing
            })
    
    def _auto_analyze_screenshot(self, screenshot_path: str):
        """Automatically analyze a screenshot for game context."""
        try:
            query = "What game is this? What is the current objective or mission?"
            print(f"🔍 Analyzing screenshot: {screenshot_path}")
            response = self.llm_processor.analyze_screenshot(screenshot_path, query)
            
            if response:
                print(f"🤖 AI Analysis: {response[:100]}...")
                
                # Extract game name if possible
                self.current_game = self._extract_game_name(response)
                if self.current_game:
                    print(f"🎮 Detected game: {self.current_game}")
                    
                    # Send auto-analysis result to frontend via a new endpoint
                    self._send_auto_analysis_result(response, self.current_game)
            else:
                print("❌ AI analysis returned no response")
                
        except Exception as e:
            print(f"❌ Auto-analysis error: {e}")
    
    def _send_auto_analysis_result(self, response: str, game_name: str):
        """Send auto-analysis result to frontend (would need WebSocket or polling)"""
        # For now, just log it - in a real app you'd use WebSocket or server-sent events
        print(f"📤 Auto-analysis complete for {game_name}")
        print(f"📝 Full response: {response}")
    
    def _extract_game_name(self, response: str) -> Optional[str]:
        """Extract game name from LLM response."""
        import re
        
        # Common game title patterns
        patterns = [
            r'(?:This is|You\'re playing|The game is) ([A-Za-z\s]+?)(?:\.|,|\n|$)',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) (?:game|series)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, response)
            if match:
                game_name = match.group(1).strip()
                if len(game_name) > 2 and len(game_name) < 50:
                    return game_name
        
        return None
    
    def run(self):
        """Run the Flask server."""
        print("🚀 Starting backend server on http://localhost:8080")
        self.app.run(host='127.0.0.1', port=8080, debug=False, use_reloader=False)

def main():
    """Main entry point for backend server."""
    print("🎮 Game Assistant Backend Server")
    print("=" * 50)
    print("Backend will be available at http://localhost:8080")
    print("Frontend will be available at http://localhost:5173")
    print("=" * 50)
    
    server = BackendServer()
    
    try:
        server.run()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        server.screenshot_manager.stop_continuous_capture()
        sys.exit(0)
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
