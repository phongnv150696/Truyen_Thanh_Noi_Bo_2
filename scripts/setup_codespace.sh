#!/bin/bash

# Setup script for GitHub Codespaces
echo "🚀 Starting setup for Truyen Thanh Noi Bo..."

# 1. Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

# 2. Restore Database
echo "🗄️ Restoring database and resetting admin password..."
# Run the restore script using node from the backend context if needed, 
# but root context is fine if node_modules are available.
node scratch/restore_system.js

echo "✅ Setup complete!"
echo "💡 To start the backend, run: cd backend && npm run dev"
