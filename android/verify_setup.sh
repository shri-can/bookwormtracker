#!/bin/bash

echo "🔍 BookwormTracker - Setup Verification"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found package.json"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found. Please run 'bash android/termux_install.sh' first."
    exit 1
fi

echo "✅ Found node_modules"

# Check if dist directory exists (after build)
if [ ! -d "dist" ]; then
    echo "⚠️  Warning: dist directory not found. Run 'npm run build' first."
    echo "   This is normal if you haven't built the app yet."
else
    echo "✅ Found dist directory"
fi

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "⚠️  Warning: data directory not found. It will be created on first run."
else
    echo "✅ Found data directory"
fi

# Check Node.js version
echo ""
echo "📋 System Information:"
echo "- Node.js version: $(node --version)"
echo "- npm version: $(npm --version)"
echo "- Current directory: $(pwd)"
echo "- Available disk space: $(df -h . | tail -1 | awk '{print $4}')"

echo ""
echo "🎉 Setup verification completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run: bash android/run_local.sh"
echo "2. Open http://127.0.0.1:5000 in Chrome"
echo ""
