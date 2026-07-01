#!/bin/bash

# Git Push Script for SVP App
# This script will add all files and push them to GitHub

set -e

echo "🚀 Preparing to push files to GitHub..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Initializing..."
    git init
    git remote add origin https://github.com/Exanteros/svpapp.git
fi

# Check git status
echo "📋 Current git status:"
git status

# Add all files
echo "📦 Adding all files..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️ No changes to commit"
    exit 0
fi

# Show what will be committed
echo "📝 Files to be committed:"
git diff --staged --name-only

# Commit with timestamp
COMMIT_MESSAGE="Production setup and email system implementation - $(date '+%Y-%m-%d %H:%M:%S')"
echo "💾 Committing with message: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Successfully pushed to GitHub!"
echo "🔗 Repository: https://github.com/Exanteros/svpapp"