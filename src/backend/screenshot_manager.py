import os
import time
import threading
from datetime import datetime
from typing import List, Optional
import pyautogui
from PIL import Image
import cv2
import numpy as np

from config import config

class ScreenshotManager:
    def __init__(self):
        self.screenshots: List[str] = []
        self.is_capturing = False
        self.capture_thread: Optional[threading.Thread] = None
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Create necessary directories if they don't exist."""
        os.makedirs(config.SCREENSHOT_DIR, exist_ok=True)
        os.makedirs(config.CACHE_DIR, exist_ok=True)
    
    def take_screenshot(self) -> Optional[str]:
        """Take a single screenshot and return the file path."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshot_{timestamp}.png"
            filepath = os.path.join(config.SCREENSHOT_DIR, filename)
            
            # Capture screenshot
            screenshot = pyautogui.screenshot()
            screenshot.save(filepath, quality=config.SCREENSHOT_QUALITY)
            
            # Add to screenshots list and maintain max limit
            self.screenshots.append(filepath)
            if len(self.screenshots) > config.MAX_SCREENSHOTS:
                old_screenshot = self.screenshots.pop(0)
                if os.path.exists(old_screenshot):
                    os.remove(old_screenshot)
            
            print(f"Screenshot saved: {filepath}")
            return filepath
            
        except Exception as e:
            print(f"Error taking screenshot: {e}")
            return None
    
    def start_continuous_capture(self):
        """Start capturing screenshots at regular intervals."""
        if self.is_capturing:
            return
        
        self.is_capturing = True
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        print("Started continuous screenshot capture")
    
    def stop_continuous_capture(self):
        """Stop continuous screenshot capture."""
        self.is_capturing = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1)
        print("Stopped continuous screenshot capture")
    
    def _capture_loop(self):
        """Main capture loop running in a separate thread."""
        while self.is_capturing:
            self.take_screenshot()
            time.sleep(config.SCREENSHOT_INTERVAL)
    
    def get_latest_screenshot(self) -> Optional[str]:
        """Get the most recent screenshot."""
        return self.screenshots[-1] if self.screenshots else None
    
    def get_screenshot_for_analysis(self) -> Optional[str]:
        """Get the best screenshot for LLM analysis (most recent)."""
        latest = self.get_latest_screenshot()
        if latest and os.path.exists(latest):
            return latest
        return None
    
    def cleanup_old_screenshots(self):
        """Remove old screenshots to free up space."""
        current_time = time.time()
        for screenshot in self.screenshots[:]:
            if os.path.exists(screenshot):
                file_age = current_time - os.path.getctime(screenshot)
                # Remove screenshots older than 1 hour
                if file_age > 3600:
                    os.remove(screenshot)
                    self.screenshots.remove(screenshot)
