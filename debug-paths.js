#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Path Debug Script ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Directory contents:');
console.log(fs.readdirSync('.'));

// Check if we're in a subdirectory
if (fs.existsSync('..')) {
  console.log('\nParent directory contents:');
  console.log(fs.readdirSync('..'));
  
  if (fs.existsSync('../..')) {
    console.log('\nGrandparent directory contents:');
    console.log(fs.readdirSync('../..'));
  }
}

// Look for dist folder in various locations
const possiblePaths = [
  './dist',
  '../dist', 
  '../../dist',
  '/opt/render/project/dist',
  '/opt/render/project/src/dist'
];

console.log('\nChecking for dist folder in various locations:');
possiblePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`✅ ${p} exists`);
    if (fs.existsSync(path.join(p, 'index.js'))) {
      console.log(`  - index.js found`);
    } else {
      console.log(`  - index.js NOT found`);
    }
  } else {
    console.log(`❌ ${p} does not exist`);
  }
});

console.log('\n=== End Debug ===');
