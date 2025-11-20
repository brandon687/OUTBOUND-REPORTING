/**
 * Comprehensive test suite for Google Credentials Validator
 *
 * Tests cover:
 * - All input formats
 * - Edge cases (encoding, quotes, newlines)
 * - Validation logic
 * - Error handling
 * - Diagnostic reporting
 */

const {
  GoogleCredentialsValidator,
  validateCredentials,
  validateFromEnv,
  validateFromJSON
} = require('./google-credentials-validator');

// Test fixtures
const VALID_EMAIL = 'test-service-account@project-id.iam.gserviceaccount.com';
const INVALID_EMAIL = 'not-an-email';
const NON_SERVICE_EMAIL = 'user@gmail.com';

// Simplified mock private key (real keys are ~1600 chars)
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

// Mock logger to suppress console output during tests
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  log: () => {}
};

describe('GoogleCredentialsValidator', () => {
  describe('Format Detection and Extraction', () => {
    test('should detect and extract environment variables format', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
        GOOGLE_PRIVATE_KEY: VALID_PRIVATE_KEY
      });

      expect(result.diagnostics.detectedFormat).toBe('environment_variables');
      expect(result.valid).toBe(true);
    });

    test('should detect and extract JSON string format', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const jsonString = JSON.stringify({
        client_email: VALID_EMAIL,
        private_key: VALID_PRIVATE_KEY,
        type: 'service_account'
      });

      const result = await validator.validate(jsonString);

      expect(result.diagnostics.detectedFormat).toBe('json_string');
      expect(result.valid).toBe(true);
    });

    test('should detect and extract credentials object format', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        client_email: VALID_EMAIL,
        private_key: VALID_PRIVATE_KEY
      });

      expect(result.diagnostics.detectedFormat).toBe('credentials_object');
      expect(result.valid).toBe(true);
    });

    test('should detect and extract separate fields format', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      expect(result.diagnostics.detectedFormat).toBe('separate_fields');
      expect(result.valid).toBe(true);
    });

    test('should detect and decode base64-encoded JSON', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const jsonString = JSON.stringify({
        client_email: VALID_EMAIL,
        private_key: VALID_PRIVATE_KEY
      });
      const base64Json = Buffer.from(jsonString).toString('base64');

      const result = await validator.validate(base64Json);

      expect(result.diagnostics.detectedFormat).toBe('base64_json');
      expect(result.valid).toBe(true);
    });

    test('should prefer base64 key over plain key', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
        GOOGLE_PRIVATE_KEY: 'wrong-key',
        GOOGLE_PRIVATE_KEY_BASE64: VALID_PRIVATE_KEY_BASE64
      });

      expect(result.valid).toBe(true);
      const hasBase64Warning = result.warnings.some(w => w.code === 'USING_BASE64');
      expect(hasBase64Warning).toBe(true);
    });

    test('should return error for unknown format', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({ unknownField: 'value' });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('UNKNOWN_FORMAT');
    });
  });

  describe('Private Key Parsing', () => {
    test('should parse plain private key', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      expect(result.valid).toBe(true);
      expect(result.credentials.private_key).toContain('BEGIN PRIVATE KEY');
    });

    test('should decode base64-encoded private key', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY_BASE64
      });

      expect(result.valid).toBe(true);
      const hasDecodeTransform = result.diagnostics.transformationsApplied.includes('base64_decode');
      expect(hasDecodeTransform).toBe(true);
    });

    test('should unescape literal \\n characters', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY_ESCAPED
      });

      expect(result.valid).toBe(true);
      const hasUnescapeTransform = result.diagnostics.transformationsApplied.includes('unescape_newlines');
      expect(hasUnescapeTransform).toBe(true);
    });

    test('should handle double-escaped newlines', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const doubleEscaped = VALID_PRIVATE_KEY.replace(/\n/g, '\\\\n');

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: doubleEscaped
      });

      expect(result.valid).toBe(true);
      const hasDoubleUnescapeTransform = result.diagnostics.transformationsApplied.includes('unescape_double_newlines');
      expect(hasDoubleUnescapeTransform).toBe(true);
    });

    test('should remove surrounding quotes', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const quotedKey = `"${VALID_PRIVATE_KEY}"`;

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: quotedKey
      });

      expect(result.valid).toBe(true);
      const hasQuoteRemoval = result.diagnostics.transformationsApplied.includes('remove_quotes');
      expect(hasQuoteRemoval).toBe(true);
    });

    test('should handle Windows CRLF line endings', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const crlfKey = VALID_PRIVATE_KEY.replace(/\n/g, '\r\n');

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: crlfKey
      });

      expect(result.valid).toBe(true);
      const hasLineEndingNormalization = result.diagnostics.transformationsApplied.includes('normalize_line_endings');
      expect(hasLineEndingNormalization).toBe(true);
    });

    test('should handle combination of transformations', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      // Base64-encoded, then quoted
      const complexKey = `"${VALID_PRIVATE_KEY_BASE64}"`;

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: complexKey
      });

      expect(result.valid).toBe(true);
      expect(result.diagnostics.transformationsApplied.length).toBeGreaterThan(1);
    });

    test('should return error for null private key', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: null
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('NULL_PRIVATE_KEY');
    });
  });

  describe('Email Validation', () => {
    test('should accept valid service account email', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      expect(result.valid).toBe(true);
    });

    test('should reject invalid email format', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: INVALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_EMAIL_FORMAT');
    });

    test('should warn about non-service-account email', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: NON_SERVICE_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      expect(result.valid).toBe(true);
      const hasEmailWarning = result.warnings.some(w => w.code === 'NON_SERVICE_ACCOUNT_EMAIL');
      expect(hasEmailWarning).toBe(true);
    });

    test('should return error for missing email', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        privateKey: VALID_PRIVATE_KEY
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_EMAIL')).toBe(true);
    });
  });

  describe('Key Structure Validation', () => {
    test('should detect missing BEGIN marker', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const invalidKey = VALID_PRIVATE_KEY.replace('-----BEGIN PRIVATE KEY-----', '');

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: invalidKey
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_BEGIN_MARKER');
    });

    test('should detect missing END marker', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const invalidKey = VALID_PRIVATE_KEY.replace('-----END PRIVATE KEY-----', '');

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: invalidKey
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_END_MARKER');
    });

    test('should detect key too short', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const shortKey = '-----BEGIN PRIVATE KEY-----\nshort\n-----END PRIVATE KEY-----';

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: shortKey
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('KEY_TOO_SHORT');
    });

    test('should detect wrong key type (RSA)', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const rsaKey = VALID_PRIVATE_KEY.replace('BEGIN PRIVATE KEY', 'BEGIN RSA PRIVATE KEY');

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: rsaKey
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('WRONG_KEY_TYPE');
    });

    test('should detect certificate instead of key', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const cert = VALID_PRIVATE_KEY.replace('BEGIN PRIVATE KEY', 'BEGIN CERTIFICATE');

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: cert
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('CERTIFICATE_NOT_KEY');
    });

    test('should warn about unusually long keys', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger,
        maxKeyLength: 100
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      const hasLongKeyWarning = result.warnings.some(w => w.code === 'KEY_TOO_LONG');
      expect(hasLongKeyWarning).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    test('validateCredentials should work', async () => {
      const result = await validateCredentials(
        {
          email: VALID_EMAIL,
          privateKey: VALID_PRIVATE_KEY
        },
        { testAuthentication: false, logger: mockLogger }
      );

      expect(result.valid).toBe(true);
    });

    test('validateFromEnv should work', async () => {
      const mockEnv = {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
        GOOGLE_PRIVATE_KEY: VALID_PRIVATE_KEY
      };

      const result = await validateFromEnv(mockEnv, {
        testAuthentication: false,
        logger: mockLogger
      });

      expect(result.valid).toBe(true);
    });

    test('validateFromJSON should parse JSON string', async () => {
      const jsonString = JSON.stringify({
        client_email: VALID_EMAIL,
        private_key: VALID_PRIVATE_KEY
      });

      const result = await validateFromJSON(jsonString, {
        testAuthentication: false,
        logger: mockLogger
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Report Generation', () => {
    test('should generate detailed report', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const validationResult = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      const report = validator.generateReport(validationResult);

      expect(report).toContain('VALIDATION REPORT');
      expect(report).toContain('Status: VALID');
      expect(report).toContain('Detected Format:');
      expect(report).toContain('Email:');
    });

    test('should include errors in report', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const validationResult = await validator.validate({
        email: INVALID_EMAIL,
        privateKey: 'invalid'
      });

      const report = validator.generateReport(validationResult);

      expect(report).toContain('Status: INVALID');
      expect(report).toContain('ERRORS:');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle undefined input', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate(undefined);

      expect(result.valid).toBe(false);
    });

    test('should handle whitespace-only key', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: '   \n   \t   '
      });

      expect(result.valid).toBe(false);
    });

    test('should handle malformed JSON', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate('{ invalid json }');

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_JSON');
    });

    test('should handle incomplete JSON', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate('{"client_email": "test@test.com"}');

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INCOMPLETE_JSON');
    });
  });

  describe('Authentication Testing', () => {
    test('should skip authentication test when disabled', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: false,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      const hasAuthStep = result.diagnostics.validationSteps.includes('test_authentication');
      expect(hasAuthStep).toBe(false);
    });

    test('should perform authentication test when enabled', async () => {
      const validator = new GoogleCredentialsValidator({
        testAuthentication: true,
        logger: mockLogger
      });

      const result = await validator.validate({
        email: VALID_EMAIL,
        privateKey: VALID_PRIVATE_KEY
      });

      const hasAuthStep = result.diagnostics.validationSteps.includes('test_authentication');
      expect(hasAuthStep).toBe(true);
      // Note: This will fail with auth error since it's a mock key,
      // but the test should still execute the auth step
    });
  });
});

// Manual test runner (for when jest is not available)
if (require.main === module) {
  console.log('Running manual tests...\n');

  const runTest = async (name, fn) => {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      console.log(`✗ ${name}`);
      console.error(`  ${error.message}`);
    }
  };

  const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'Assertion failed');
  };

  (async () => {
    await runTest('Should validate environment variables format', async () => {
      const result = await validateCredentials(
        {
          GOOGLE_SERVICE_ACCOUNT_EMAIL: VALID_EMAIL,
          GOOGLE_PRIVATE_KEY: VALID_PRIVATE_KEY
        },
        { testAuthentication: false, logger: mockLogger }
      );
      assert(result.valid === true, 'Should be valid');
      assert(result.diagnostics.detectedFormat === 'environment_variables');
    });

    await runTest('Should handle escaped newlines', async () => {
      const result = await validateCredentials(
        {
          email: VALID_EMAIL,
          privateKey: VALID_PRIVATE_KEY_ESCAPED
        },
        { testAuthentication: false, logger: mockLogger }
      );
      assert(result.valid === true, 'Should be valid');
      assert(result.diagnostics.transformationsApplied.includes('unescape_newlines'));
    });

    await runTest('Should detect missing BEGIN marker', async () => {
      const invalidKey = VALID_PRIVATE_KEY.replace('-----BEGIN PRIVATE KEY-----', '');
      const result = await validateCredentials(
        {
          email: VALID_EMAIL,
          privateKey: invalidKey
        },
        { testAuthentication: false, logger: mockLogger }
      );
      assert(result.valid === false, 'Should be invalid');
      assert(result.errors[0].code === 'MISSING_BEGIN_MARKER');
    });

    await runTest('Should reject invalid email', async () => {
      const result = await validateCredentials(
        {
          email: 'not-an-email',
          privateKey: VALID_PRIVATE_KEY
        },
        { testAuthentication: false, logger: mockLogger }
      );
      assert(result.valid === false, 'Should be invalid');
      assert(result.errors[0].code === 'INVALID_EMAIL_FORMAT');
    });

    console.log('\n✅ All manual tests completed!');
  })();
}
