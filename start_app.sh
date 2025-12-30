#!/bin/bash

# Game Assistant Startup Script
echo "🎮 Starting Game Assistant..."

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: OPENAI_API_KEY not set"
    echo "   AI features will be disabled"
    echo "   Set it with: export OPENAI_API_KEY='your-key-here'"
    echo ""
fi

# Start Python backend in background
echo "🚀 Starting Python backend..."
python3 backend_server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend is running
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully"

# Start Electron app
echo "🖥️  Starting Electron app..."
npm start

# Cleanup on exit
echo "🛑 Shutting down..."
kill $BACKEND_PID 2>/dev/null
echo "✅ Game Assistant stopped"
