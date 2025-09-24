#!/bin/bash

echo "🚀 BookwormTracker - Starting Local Server"
echo "=========================================="
echo ""

# Set environment variables for local production mode
export HOST=127.0.0.1
export PORT=5000
export NODE_ENV=production
export LOCAL_PERSIST=1

echo "🔧 Configuration:"
echo "- Host: $HOST"
echo "- Port: $PORT"
echo "- Mode: Production (optimized)"
echo "- Storage: Local file-based (./data/store.json)"
echo ""

# Build and start the application
echo "🏗️  Building and starting application..."
echo "📱 Open http://127.0.0.1:5000 in Chrome to access the app"
echo ""
echo "💡 Tips:"
echo "- Use 'termux-wake-lock' to prevent screen from sleeping"
echo "- Press Ctrl+C to stop the server"
echo "- Your reading data is saved locally at ./data/store.json"
echo ""

# Use the android npm script for easier management
npm run android

echo ""
echo "👋 Server stopped. Your data is safely saved at ./data/store.json"
