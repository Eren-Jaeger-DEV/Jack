#!/bin/bash
# start-test.sh — Launch Jack-Dav (test bot) using .env.test

echo "🧪 Starting Jack-Dav (Test Bot) — Bot's land"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load test env instead of production env
export $(grep -v '^#' .env.test | xargs)

node bot/index.js
