import os
import base64
import requests
from typing import Optional, Dict, Any
from PIL import Image
import io
from dotenv import load_dotenv
load_dotenv()
from config import config

class LLMProcessor:
    def __init__(self):
        self.api_key = config.OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
    
    def encode_image(self, image_path: str) -> str:
        """Encode image to base64 string."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    def analyze_screenshot(self, image_path: str, query: str) -> Optional[str]:
        """Analyze screenshot with multimodal LLM."""
        try:
            # Get the base64 image
            base64_image = self.encode_image(image_path)
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            payload = {
                "model": config.MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": """You are a gaming assistant AI. Analyze the provided game screenshot and answer the user's question. 
                        Focus on:
                        - Game state and progress indicators
                        - UI elements, maps, minimaps
                        - Character status, inventory, objectives
                        - Mission details, timers, progress bars
                        
                        Provide helpful, concise answers about game mechanics, objectives, or strategies based on what you can see."""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": query
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": config.MAX_TOKENS,
                "temperature": config.TEMPERATURE
            }
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                print(f"LLM API Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error analyzing screenshot: {e}")
            return None
    
    def process_text_query(self, query: str, game_context: Optional[str] = None) -> Optional[str]:
        """Process text-only query with optional game context."""
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            system_message = """You are a knowledgeable gaming assistant. Provide helpful hints, tips, and strategies for video games.
            Focus on:
            - Game mechanics and strategies
            - Mission walkthroughs
            - Item locations and unlock requirements
            - Character builds and optimization
            
            Be concise but thorough in your responses."""
            
            if game_context:
                system_message += f"\n\nCurrent game context: {game_context}"
            
            payload = {
                "model": "gpt-4.1-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": system_message
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                "max_tokens": config.MAX_TOKENS,
                "temperature": config.TEMPERATURE
            }
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                print(f"LLM API Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error processing text query: {e}")
            return None
