#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('=== Starting Application ===');
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync('.'));

// Check all possible locations for index.js
const possibleLocations = [
  'build/index.js',
  'dist/index.js', 
  'src/dist/index.js'
];

console.log('\nChecking for index.js in possible locations:');
let foundLocation = null;

possibleLocations.forEach(loc => {
  if (fs.existsSync(loc)) {
    console.log(`✅ ${loc} exists`);
    if (!foundLocation) {
      foundLocation = loc;
    }
  } else {
    console.log(`❌ ${loc} does not exist`);
  }
});

if (!foundLocation) {
  console.log('\n❌ No index.js found in any location!');
  console.log('Build may have failed or compatibility script did not run.');
  process.exit(1);
}

console.log(`\n🚀 Starting application from ${foundLocation}...`);

// Start the application
const child = spawn('node', [foundLocation], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('error', (error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});
