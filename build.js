// build.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// 1. Create a Zip of the extension folder
function createZip() {
  return new Promise((resolve, reject) => {
    console.log('Creating ZIP...');
    const output = fs.createWriteStream(path.join(__dirname, 'dist', 'extension.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`ZIP created: ${archive.pointer()} total bytes`);
      resolve();
    });
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(path.join(__dirname, 'extension'), false);
    archive.finalize();
  });
}

// 2. Create a CRX for Chrome
function createCrx() {
  console.log('Creating CRX...');
  try {
    // Make sure you have extension.key in the project root
    // crx pack extension --key=extension.key --out=extension.crx
    execSync(`npx crx pack ${path.join(__dirname, 'extension')} -p extension.key -o extension.crx`, {
      stdio: 'inherit'
    });
    console.log('CRX created: extension.crx');
  } catch (error) {
    console.error('Failed to create CRX:', error);
  }
}

// 3. Create an XPI for Firefox
// Using web-ext build command
function createXpi() {
  console.log('Creating XPI...');
  try {
    // The command below will place the .xpi inside a newly created "web-ext-artifacts" folder
    execSync(`npx web-ext build -s ${path.join(__dirname, 'extension')} -a ${path.join(__dirname, 'dist')} -n web-extension-firefox.xpi --overwrite-dest`, {
      stdio: 'inherit'
    });
    console.log('XPI created in dist/web-ext-artifacts/');
  } catch (error) {
    console.error('Failed to create XPI:', error);
  }
}

// Run all steps in sequence
(async function main() {
  try {
    await createZip();
    // createCrx();
    createXpi();
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
})();
