#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Build Verification Script ===');
console.log('Current working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync('.'));

if (fs.existsSync('dist')) {
  console.log('\nDist folder exists. Contents:');
  console.log(fs.readdirSync('dist'));
  
  if (fs.existsSync('dist/index.js')) {
    console.log('\n✅ dist/index.js found!');
    const stats = fs.statSync('dist/index.js');
    console.log('File size:', stats.size, 'bytes');
    console.log('Last modified:', stats.mtime);
  } else {
    console.log('\n❌ dist/index.js NOT found!');
  }
} else {
  console.log('\n❌ Dist folder does not exist!');
}

if (fs.existsSync('src')) {
  console.log('\nSrc folder exists. Contents:');
  console.log(fs.readdirSync('src'));
}

console.log('\n=== End Verification ===');
