#!/bin/bash

echo "🚀 BookwormTracker - Quick Start"
echo "==============================="
echo ""

# Check if installation is complete
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    bash android/termux_install.sh
    echo ""
fi

# Start the app
echo "🚀 Starting BookwormTracker..."
bash android/run_local.sh
