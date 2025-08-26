#!/bin/bash

echo "=== Render Build Script ==="
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

if [ -d "dist" ]; then
    echo "Dist folder exists. Contents:"
    ls -la dist/
    
    if [ -f "dist/index.js" ]; then
        echo "✅ dist/index.js found!"
        echo "File size: $(stat -c%s dist/index.js) bytes"
    else
        echo "❌ dist/index.js NOT found!"
        exit 1
    fi
else
    echo "❌ Dist folder does not exist!"
    exit 1
fi

echo "=== Build Script Completed ==="
