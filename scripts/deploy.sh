#!/bin/bash

# Jack Bot Production Deployment Script
# 1. Source sync
echo "🚀 Fetching latest code from GitHub..."
git pull origin main

# 2. Dependency management
echo "📦 Installing/Updating dependencies..."
npm install

# 3. Discord Sync
echo "📡 Synchronizing slash commands with Discord API..."
node scripts/deploy-commands.js

# 4. Restart Process
echo "🔄 Refreshing Jack Bot process (PM2)..."
pm2 restart jack

echo "✅ Deployment complete. System is live."
