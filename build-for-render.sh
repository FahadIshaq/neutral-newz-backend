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

if [ -d "build" ]; then
    echo "Build folder exists. Contents:"
    ls -la build/
    
    if [ -f "build/index.js" ]; then
        echo "✅ build/index.js found!"
        echo "File size: $(stat -c%s build/index.js) bytes"
        
        # Create dist directory for compatibility
        echo "Creating dist directory for compatibility..."
        mkdir -p dist
        cp -r build/* dist/
        echo "Dist contents:"
        ls -la dist/
        
        # Copy to src/dist for Render compatibility
        echo "Copying to src/dist for Render compatibility..."
        mkdir -p src/dist
        cp -r build/* src/dist/
        echo "src/dist contents:"
        ls -la src/dist/
        
        if [ -f "src/dist/index.js" ]; then
            echo "✅ src/dist/index.js created successfully!"
        else
            echo "❌ Failed to create src/dist/index.js"
            exit 1
        fi
        
        # Also create a symlink to ensure both locations work
        echo "Creating symlink for compatibility..."
        ln -sf build src/build_link
        echo "Symlink created:"
        ls -la src/build_link/
    else
        echo "❌ build/index.js NOT found!"
        exit 1
    fi
else
    echo "❌ Build folder does not exist!"
    exit 1
fi

echo "=== Build Script Completed ==="
