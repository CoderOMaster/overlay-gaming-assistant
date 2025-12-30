import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class Config:
    # API Keys
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Screenshot settings
    SCREENSHOT_INTERVAL: int = 300  # seconds (5 minutes)
    SCREENSHOT_QUALITY: int = 85
    MAX_SCREENSHOTS: int = 10
    
    # Overlay settings
    OVERLAY_WIDTH: int = 400
    OVERLAY_HEIGHT: int = 300
    OVERLAY_OPACITY: float = 0.9
    
    # LLM settings
    MODEL_NAME: str = "gpt-4o-mini"
    MAX_TOKENS: int = 5000
    TEMPERATURE: float = 0.1
    
    # Web search settings
    SEARCH_TIMEOUT: int = 10
    MAX_SEARCH_RESULTS: int = 5
    
    # Hotkeys
    TOGGLE_OVERLAY_HOTKEY: str = "ctrl+shift+g"
    TAKE_SCREENSHOT_HOTKEY: str = "ctrl+shift+s"
    
    # Storage
    CACHE_DIR: str = "cache"
    SCREENSHOT_DIR: str = "screenshots"

config = Config()
