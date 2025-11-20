#!/usr/bin/env node

/**
 * Helper script to encode Google service account private key as base64
 * This helps avoid newline issues when setting environment variables in Railway
 *
 * Usage:
 *   node encode-google-key.js path/to/service-account-key.json
 *
 * Or manually provide the private key string from your JSON file
 */

const fs = require('fs');

function encodePrivateKey(privateKey) {
  const base64 = Buffer.from(privateKey).toString('base64');
  console.log('\n✅ Base64-encoded private key (copy this to GOOGLE_PRIVATE_KEY_BASE64):\n');
  console.log(base64);
  console.log('\n📋 To use in Railway:');
  console.log('1. Go to your Railway project settings');
  console.log('2. Add a new environment variable: GOOGLE_PRIVATE_KEY_BASE64');
  console.log('3. Paste the base64 string above as the value');
  console.log('4. Remove GOOGLE_PRIVATE_KEY if it exists');
  console.log('5. Redeploy your application\n');
}

// Check if file path provided
if (process.argv[2]) {
  const filePath = process.argv[2];

  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.private_key) {
      console.error('❌ No private_key field found in JSON file');
      process.exit(1);
    }

    console.log('✓ Found private_key in JSON file');
    console.log('✓ Service account email:', data.client_email);

    encodePrivateKey(data.private_key);

  } catch (error) {
    console.error('❌ Error reading JSON file:', error.message);
    process.exit(1);
  }
} else {
  // Interactive mode - ask user to paste the key
  console.log('📝 Paste your private key (from "private_key" field in JSON):');
  console.log('   (Include the full key: -----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n)');
  console.log('   Press Ctrl+D when done.\n');

  let input = '';
  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    const privateKey = input.trim();

    if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
      console.error('\n❌ Invalid private key format');
      process.exit(1);
    }

    encodePrivateKey(privateKey);
  });
}
