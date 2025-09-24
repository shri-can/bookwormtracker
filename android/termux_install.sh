#!/bin/bash

echo "🚀 BookwormTracker - Termux Installation Script"
echo "=============================================="
echo ""

# Update package lists and upgrade system
echo "📦 Updating package lists and upgrading system..."
pkg update -y && pkg upgrade -y

# Install required packages
echo "📦 Installing Node.js, Git, and other dependencies..."
pkg install -y nodejs-lts git unzip

# Setup storage permissions
echo "📁 Setting up storage permissions..."
termux-setup-storage

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create data directory for local storage
echo "📁 Creating data directory..."
mkdir -p data

echo ""
echo "✅ Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Run: bash android/run_local.sh"
echo "2. Open http://127.0.0.1:5000 in Chrome"
echo ""
echo "💡 Tips:"
echo "- Use 'termux-wake-lock' to prevent screen from sleeping during long reading sessions"
echo "- Your data will be saved to ./data/store.json"
echo "- To stop the server, press Ctrl+C"
echo ""
echo "🔧 Troubleshooting:"
echo "- If you get permission errors, run: chmod +x android/*.sh"
echo "- If port 5000 is busy, the script will try other ports automatically"
echo ""
