#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Creating Compatibility Directories ===');

try {
  // Check if build directory exists
  if (!fs.existsSync('build')) {
    console.log('❌ Build directory does not exist!');
    console.log('Current directory contents:', fs.readdirSync('.'));
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
    console.log('✅ Created src directory');
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
      console.log(`✅ Copied ${file} to dist/`);
    } else if (fs.statSync(sourcePath).isDirectory()) {
      // For directories, we need to copy recursively
      fs.cpSync(sourcePath, destPath, { recursive: true });
      console.log(`✅ Copied directory ${file} to dist/`);
    }
  });

  // Copy files from build to src/dist
  console.log('Copying build files to src/dist...');
  buildFiles.forEach(file => {
    const sourcePath = path.join('build', file);
    const destPath = path.join('src/dist', file);
    
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${file} to src/dist/`);
    } else if (fs.statSync(sourcePath).isDirectory()) {
      // For directories, we need to copy recursively
      fs.cpSync(sourcePath, destPath, { recursive: true });
      console.log(`✅ Copied directory ${file} to src/dist/`);
    }
  });

  console.log('✅ Compatibility directories created successfully');
  console.log('dist contents:', fs.readdirSync('dist'));
  console.log('src/dist contents:', fs.readdirSync('src/dist'));

  // Verify that index.js exists in all locations
  const locations = ['build', 'dist', 'src/dist'];
  locations.forEach(loc => {
    if (fs.existsSync(path.join(loc, 'index.js'))) {
      console.log(`✅ ${loc}/index.js exists`);
    } else {
      console.log(`❌ ${loc}/index.js missing`);
    }
  });

  console.log('=== Compatibility Setup Complete ===');
} catch (error) {
  console.error('❌ Error creating compatibility directories:', error);
  process.exit(1);
}
