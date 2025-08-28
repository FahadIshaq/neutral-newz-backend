#!/bin/bash

echo "=== Build and Start Script ==="
echo "Current working directory: $(pwd)"
echo "Directory contents:"
ls -la

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Build completed. Checking output:"
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Check if build directory exists and has index.js
if [ -d "build" ] && [ -f "build/index.js" ]; then
    echo "✅ build/index.js found!"
    echo "Starting application from build/index.js..."
    node build/index.js
elif [ -d "dist" ] && [ -f "dist/index.js" ]; then
    echo "✅ dist/index.js found!"
    echo "Starting application from dist/index.js..."
    node dist/index.js
elif [ -d "src/dist" ] && [ -f "src/dist/index.js" ]; then
    echo "✅ src/dist/index.js found!"
    echo "Starting application from src/dist/index.js..."
    node src/dist/index.js
else
    echo "❌ No index.js found in any location!"
    echo "Build may have failed. Checking directories:"
    if [ -d "build" ]; then echo "build contents:"; ls -la build/; fi
    if [ -d "dist" ]; then echo "dist contents:"; ls -la dist/; fi
    if [ -d "src" ]; then echo "src contents:"; ls -la src/; fi
    exit 1
fi
