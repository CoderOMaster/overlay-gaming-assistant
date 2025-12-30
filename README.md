# Game Assistant Desktop Overlay

A desktop overlay application that helps gamers with real-time assistance using AI and web search. The app captures screenshots, analyzes game state, and provides helpful hints and walkthroughs.

## Features

- 🖼️ **Automatic Screenshot Capture** - Captures game screenshots at regular intervals
- 🤖 **AI-Powered Analysis** - Uses multimodal LLM to analyze screenshots and answer questions
- 🔍 **Web Search Integration** - Searches for game guides, walkthroughs, and tips
- 🎮 **Transparent Overlay** - Minimal overlay that doesn't interfere with gameplay
- 🎯 **System Tray Integration** - Runs in background with easy access
- ⌨️ **Global Hotkeys** - Quick access without leaving your game
- 🔧 **Configurable Settings** - Adjust capture intervals, opacity, and more

## Installation

1. **Clone or download the project**
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up OpenAI API key** (optional but recommended):
   ```bash
   # For Linux/macOS
   export OPENAI_API_KEY='your-openai-api-key-here'
   
   # For Windows
   set OPENAI_API_KEY=your-openai-api-key-here
   ```

## Usage

1. **Run the application**:
   ```bash
   python game_assistant.py
   ```

2. **Use hotkeys**:
   - `Ctrl+Shift+G` - Toggle overlay visibility
   - `Ctrl+Shift+S` - Take screenshot immediately

3. **Ask questions** through the overlay:
   - "How much longer do I need to finish this mission?"
   - "How do I get this charm and unlock the level?"
   - "What's the best strategy for this boss?"
   - "Where can I find item X?"

## How It Works

1. **Screenshot Capture**: The app automatically captures screenshots every 30 seconds (configurable)
2. **AI Analysis**: When you ask a question, the latest screenshot is analyzed by a multimodal LLM
3. **Web Search**: If AI analysis doesn't provide sufficient answers, the app searches for relevant game guides
4. **Response Display**: Answers are displayed in the transparent overlay without interrupting your game

## Configuration

You can modify settings in `config.py`:

- `SCREENSHOT_INTERVAL`: Time between automatic screenshots (seconds)
- `OVERLAY_OPACITY`: Transparency of the overlay window (0.3-1.0)
- `MODEL_NAME`: OpenAI model to use for analysis
- `HOTKEYS`: Customize keyboard shortcuts

## Project Structure

```
├── game_assistant.py      # Main application entry point
├── config.py              # Configuration settings
├── screenshot_manager.py  # Handles screenshot capture
├── llm_processor.py       # AI/LLM integration
├── web_searcher.py        # Web search functionality
├── overlay_ui.py          # User interface and system tray
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Requirements

- Python 3.7+
- OpenAI API key (for AI features)
- Internet connection (for web search and AI API)

## Platform Support

- ✅ Windows
- ✅ macOS  
- ✅ Linux

## Troubleshooting

**Hotkeys not working?**
- On macOS, you may need to grant accessibility permissions
- On Linux, make sure keyboard permissions are properly configured

**Overlay not appearing?**
- Check that the app has proper display permissions
- Try toggling with the system tray icon

**AI features not working?**
- Verify your OpenAI API key is set correctly
- Check your internet connection

## Privacy

- Screenshots are stored locally and deleted after 1 hour
- No personal data is sent to third parties except for AI API calls
- Web searches are performed through privacy-friendly services

## License

MIT License - feel free to modify and distribute as needed.

## Contributing

Contributions welcome! Please feel free to submit issues and enhancement requests.
