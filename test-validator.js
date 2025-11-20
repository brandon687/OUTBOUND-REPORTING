#!/usr/bin/env node

/**
 * Quick test script for Google Credentials Validator
 */

const {
  validateCredentials,
  validateFromEnv
} = require('./lib/google-credentials-validator');

// Mock logger to suppress output during tests
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  log: () => {}
};

// Test fixtures
const VALID_EMAIL = 'test-service-account@project-id.iam.gserviceaccount.com';
const VALID_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
xKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkXxKm7kKKLLqKLQHkX
AgMBAAECggEABqJ3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J
3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3
WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3W
QgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQ
gZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQg
Z6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ
6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6
J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J
3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3
WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3W
QgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQ
gZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQg
Z6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ6J3WQgZ
-----END PRIVATE KEY-----`;

const VALID_PRIVATE_KEY_ESCAPED = VALID_PRIVATE_KEY.replace(/\n/g, '\\n');
const VALID_PRIVATE_KEY_BASE64 = Buffer.from(VALID_PRIVATE_KEY).toString('base64');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTest(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    console.log('✓ PASS');
    passCount++;
  } catch (error) {
    console.log('✗ FAIL');
    console.error(`  Error: ${error.message}`);
    failCount++;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('Google Credentials Validator - Quick Tests');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Environment variables format
  await runTest('Environment variables format', async () => {
    const result = await validateCredentials(
      {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
        GOOGLE_PRIVATE_KEY: VALID_PRIVATE_KEY
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === true, 'Should be valid');
    assert(result.diagnostics.detectedFormat === 'environment_variables', 'Should detect env vars format');
  });

  // Test 2: Escaped newlines
  await runTest('Escaped newlines (\\n)', async () => {
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY_ESCAPED
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === true, 'Should be valid');
    assert(
      result.diagnostics.transformationsApplied.includes('unescape_newlines'),
      'Should unescape newlines'
    );
  });

  // Test 3: Base64-encoded key
  await runTest('Base64-encoded key', async () => {
    const result = await validateCredentials(
      {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
        GOOGLE_PRIVATE_KEY_BASE64: VALID_PRIVATE_KEY_BASE64
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === true, 'Should be valid');
    assert(
      result.diagnostics.transformationsApplied.includes('base64_decode'),
      'Should decode base64'
    );
  });

  // Test 4: JSON string format
  await runTest('JSON string format', async () => {
    const jsonString = JSON.stringify({
      client_email: VALID_EMAIL,
      private_key: VALID_PRIVATE_KEY
    });
    const result = await validateCredentials(jsonString, {
      testAuthentication: false,
      logger: mockLogger
    });
    assert(result.valid === true, 'Should be valid');
    assert(result.diagnostics.detectedFormat === 'json_string', 'Should detect JSON format');
  });

  // Test 5: Quoted key
  await runTest('Quoted key removal', async () => {
    const quotedKey = `"${VALID_PRIVATE_KEY}"`;
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: quotedKey
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === true, 'Should be valid');
    assert(
      result.diagnostics.transformationsApplied.includes('remove_quotes'),
      'Should remove quotes'
    );
  });

  // Test 6: Missing email
  await runTest('Missing email detection', async () => {
    const result = await validateCredentials(
      { privateKey: VALID_PRIVATE_KEY },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(result.errors.some(e => e.code === 'MISSING_EMAIL'), 'Should have MISSING_EMAIL error');
  });

  // Test 7: Invalid email format
  await runTest('Invalid email format detection', async () => {
    const result = await validateCredentials(
      {
        email: 'not-an-email',
        privateKey: VALID_PRIVATE_KEY
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(
      result.errors[0].code === 'INVALID_EMAIL_FORMAT',
      'Should have INVALID_EMAIL_FORMAT error'
    );
  });

  // Test 8: Missing BEGIN marker
  await runTest('Missing BEGIN marker detection', async () => {
    const invalidKey = VALID_PRIVATE_KEY.replace('-----BEGIN PRIVATE KEY-----', '');
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: invalidKey
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(
      result.errors[0].code === 'MISSING_BEGIN_MARKER',
      'Should have MISSING_BEGIN_MARKER error'
    );
  });

  // Test 9: Missing END marker
  await runTest('Missing END marker detection', async () => {
    const invalidKey = VALID_PRIVATE_KEY.replace('-----END PRIVATE KEY-----', '');
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: invalidKey
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(
      result.errors[0].code === 'MISSING_END_MARKER',
      'Should have MISSING_END_MARKER error'
    );
  });

  // Test 10: Key too short
  await runTest('Key too short detection', async () => {
    const shortKey = '-----BEGIN PRIVATE KEY-----\nshort\n-----END PRIVATE KEY-----';
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: shortKey
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(result.errors[0].code === 'KEY_TOO_SHORT', 'Should have KEY_TOO_SHORT error');
  });

  // Test 11: Wrong key type (RSA)
  await runTest('Wrong key type detection (RSA)', async () => {
    const rsaKey = VALID_PRIVATE_KEY.replace('PRIVATE KEY', 'RSA PRIVATE KEY');
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: rsaKey
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(result.errors[0].code === 'WRONG_KEY_TYPE', 'Should have WRONG_KEY_TYPE error');
  });

  // Test 12: Certificate instead of key
  await runTest('Certificate detection', async () => {
    const cert = VALID_PRIVATE_KEY.replace('PRIVATE KEY', 'CERTIFICATE');
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: cert
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(
      result.errors[0].code === 'CERTIFICATE_NOT_KEY',
      'Should have CERTIFICATE_NOT_KEY error'
    );
  });

  // Test 13: Unknown format
  await runTest('Unknown format detection', async () => {
    const result = await validateCredentials(
      { unknownField: 'value' },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === false, 'Should be invalid');
    assert(result.errors[0].code === 'UNKNOWN_FORMAT', 'Should have UNKNOWN_FORMAT error');
  });

  // Test 14: Combined transformations
  await runTest('Multiple transformations', async () => {
    const complexKey = `"${VALID_PRIVATE_KEY_BASE64}"`;
    const result = await validateCredentials(
      {
        email: VALID_EMAIL,
        privateKey: complexKey
      },
      { testAuthentication: false, logger: mockLogger }
    );
    assert(result.valid === true, 'Should be valid');
    assert(
      result.diagnostics.transformationsApplied.length > 1,
      'Should apply multiple transformations'
    );
  });

  // Test 15: validateFromEnv convenience function
  await runTest('validateFromEnv function', async () => {
    const mockEnv = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
      GOOGLE_PRIVATE_KEY: VALID_PRIVATE_KEY
    };
    const result = await validateFromEnv(mockEnv, {
      testAuthentication: false,
      logger: mockLogger
    });
    assert(result.valid === true, 'Should be valid');
  });

  console.log('');
  console.log('='.repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(80));

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

main().catch(error => {
  console.error('\n❌ Test runner failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
