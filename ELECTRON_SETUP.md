# Electron Game Assistant Setup

## Quick Start

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set OpenAI API key (optional but recommended):**
   ```bash
   export OPENAI_API_KEY='your-key-here'
   ```

4. **Run the app (recommended):**
   ```bash
   ./start_app.sh
   ```
   
   **Or manually:**
   ```bash
   # Terminal 1: Start backend
   python3 backend_server.py
   
   # Terminal 2: Start frontend
   npm start
   ```

## Features

- 🖼️ Transparent overlay window
- 📸 Screenshot capture with AI analysis
- 🤖 AI-powered game analysis
- 🔍 Web search integration
- ⚙️ Settings modal
- 🎮 System tray integration
- ⌨️ Global hotkeys (Ctrl+Shift+G, Ctrl+Shift+S)

## Troubleshooting

**LLM not working?**
- Set your OpenAI API key: `export OPENAI_API_KEY='your-key'`
- Check backend logs for AI analysis messages

**Connection errors?**
- Make sure Python backend is running on port 8000
- Use the startup script to handle both processes

**Screenshot not analyzing?**
- Check that OPENAI_API_KEY is set
- Look for "🤖 Auto-analyzing screenshot..." in backend logs
