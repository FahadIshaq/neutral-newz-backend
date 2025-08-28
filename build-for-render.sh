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
        
        # Copy to src/dist for Render compatibility
        echo "Copying dist to src/dist for Render compatibility..."
        mkdir -p src/dist
        cp -r dist/* src/dist/
        echo "src/dist contents:"
        ls -la src/dist/
        
        if [ -f "src/dist/index.js" ]; then
            echo "✅ src/dist/index.js created successfully!"
        else
            echo "❌ Failed to create src/dist/index.js"
            exit 1
        fi
    else
        echo "❌ dist/index.js NOT found!"
        exit 1
    fi
else
    echo "❌ Dist folder does not exist!"
    exit 1
fi

echo "=== Build Script Completed ==="
