#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Creating Compatibility Directories ===');

// Check if build directory exists
if (!fs.existsSync('build')) {
  console.log('❌ Build directory does not exist!');
  process.exit(1);
}

console.log('✅ Build directory found');
console.log('Build contents:', fs.readdirSync('build'));

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
  console.log('✅ Created dist directory');
}

// Create src/dist directory
if (!fs.existsSync('src')) {
  fs.mkdirSync('src', { recursive: true });
}
if (!fs.existsSync('src/dist')) {
  fs.mkdirSync('src/dist', { recursive: true });
  console.log('✅ Created src/dist directory');
}

// Copy files from build to dist
console.log('Copying build files to dist...');
const buildFiles = fs.readdirSync('build');
buildFiles.forEach(file => {
  const sourcePath = path.join('build', file);
  const destPath = path.join('dist', file);
  
  if (fs.statSync(sourcePath).isFile()) {
    fs.copyFileSync(sourcePath, destPath);
  } else if (fs.statSync(sourcePath).isDirectory()) {
    // For directories, we need to copy recursively
    fs.cpSync(sourcePath, destPath, { recursive: true });
  }
});

// Copy files from build to src/dist
console.log('Copying build files to src/dist...');
buildFiles.forEach(file => {
  const sourcePath = path.join('build', file);
  const destPath = path.join('src/dist', file);
  
  if (fs.statSync(sourcePath).isFile()) {
    fs.copyFileSync(sourcePath, destPath);
  } else if (fs.statSync(sourcePath).isDirectory()) {
    // For directories, we need to copy recursively
    fs.cpSync(sourcePath, destPath, { recursive: true });
  }
});

console.log('✅ Compatibility directories created successfully');
console.log('dist contents:', fs.readdirSync('dist'));
console.log('src/dist contents:', fs.readdirSync('src/dist'));

console.log('=== Compatibility Setup Complete ===');
