/**
 * Bulletproof Google Service Account Credential Validator
 *
 * This module provides robust validation and parsing of Google service account
 * credentials from various input formats with detailed error reporting and
 * fallback mechanisms.
 *
 * Features:
 * - Multi-format support (JSON, base64, plain text, escaped strings)
 * - Automatic format detection
 * - Comprehensive validation of each credential component
 * - Detailed error messages with actionable suggestions
 * - Pre-authentication testing
 * - Diagnostic logging
 *
 * @module google-credentials-validator
 */

const { google } = require('googleapis');

/**
 * Error class for credential validation failures
 */
class CredentialValidationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CredentialValidationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether credentials are valid
 * @property {Object|null} credentials - Parsed credentials if valid
 * @property {Array<string>} errors - List of validation errors
 * @property {Array<string>} warnings - List of validation warnings
 * @property {Object} diagnostics - Detailed diagnostic information
 */

/**
 * Main credential validator class
 */
class GoogleCredentialsValidator {
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode !== false, // Default to strict
      testAuthentication: options.testAuthentication !== false, // Default to test
      minKeyLength: options.minKeyLength || 1600,
      maxKeyLength: options.maxKeyLength || 4096,
      logger: options.logger || console,
      ...options
    };

    this.diagnostics = {
      detectedFormat: null,
      transformationsApplied: [],
      validationSteps: [],
      timeElapsed: 0
    };
  }

  /**
   * Main entry point - validates credentials from any source
   * @param {Object} input - Input containing credentials
   * @returns {Promise<ValidationResult>}
   */
  async validate(input) {
    const startTime = Date.now();
    const result = {
      valid: false,
      credentials: null,
      errors: [],
      warnings: [],
      diagnostics: this.diagnostics
    };

    try {
      // Step 1: Extract credentials from input
      this.log('info', 'Starting credential validation...');
      const extracted = this.extractCredentials(input);

      if (extracted.errors.length > 0) {
        result.errors.push(...extracted.errors);
        return result;
      }

      result.warnings.push(...extracted.warnings);

      // Step 2: Parse and normalize private key
      const parsedKey = this.parsePrivateKey(extracted.privateKey);

      if (parsedKey.errors.length > 0) {
        result.errors.push(...parsedKey.errors);
        return result;
      }

      result.warnings.push(...parsedKey.warnings);

      // Step 3: Validate email format
      const emailValidation = this.validateEmail(extracted.email);

      if (emailValidation.errors.length > 0) {
        result.errors.push(...emailValidation.errors);
        return result;
      }

      result.warnings.push(...emailValidation.warnings);

      // Step 4: Create credentials object
      const credentials = {
        client_email: extracted.email,
        private_key: parsedKey.key,
        type: 'service_account'
      };

      // Step 5: Validate key structure
      const structureValidation = this.validateKeyStructure(parsedKey.key);

      if (structureValidation.errors.length > 0) {
        result.errors.push(...structureValidation.errors);
        return result;
      }

      result.warnings.push(...structureValidation.warnings);

      // Step 6: Test authentication (if enabled)
      if (this.options.testAuthentication) {
        this.log('info', 'Testing authentication with Google APIs...');
        const authTest = await this.testAuthentication(credentials);

        if (authTest.errors.length > 0) {
          result.errors.push(...authTest.errors);
          return result;
        }

        result.warnings.push(...authTest.warnings);
      }

      // All validations passed
      result.valid = true;
      result.credentials = credentials;
      this.log('info', 'Credential validation successful!');

    } catch (error) {
      result.errors.push({
        message: `Unexpected error during validation: ${error.message}`,
        code: 'UNEXPECTED_ERROR',
        suggestion: 'Check logs for stack trace'
      });
      this.log('error', 'Unexpected validation error:', error);
    } finally {
      this.diagnostics.timeElapsed = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Extract credentials from various input formats
   * @private
   */
  extractCredentials(input) {
    const result = {
      email: null,
      privateKey: null,
      errors: [],
      warnings: []
    };

    this.diagnostics.validationSteps.push('extract_credentials');

    // Case 1: Environment variables object
    if (input.GOOGLE_SERVICE_ACCOUNT_EMAIL || input.GOOGLE_PRIVATE_KEY || input.GOOGLE_PRIVATE_KEY_BASE64) {
      this.diagnostics.detectedFormat = 'environment_variables';

      result.email = input.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      result.privateKey = input.GOOGLE_PRIVATE_KEY_BASE64 || input.GOOGLE_PRIVATE_KEY;

      if (!result.email) {
        result.errors.push({
          message: 'GOOGLE_SERVICE_ACCOUNT_EMAIL is missing',
          code: 'MISSING_EMAIL',
          suggestion: 'Set the GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable'
        });
      }

      if (!result.privateKey) {
        result.errors.push({
          message: 'Private key is missing (checked GOOGLE_PRIVATE_KEY_BASE64 and GOOGLE_PRIVATE_KEY)',
          code: 'MISSING_PRIVATE_KEY',
          suggestion: 'Set either GOOGLE_PRIVATE_KEY_BASE64 (recommended) or GOOGLE_PRIVATE_KEY'
        });
      }

      if (input.GOOGLE_PRIVATE_KEY_BASE64) {
        result.warnings.push({
          message: 'Using base64-encoded key (recommended)',
          code: 'USING_BASE64'
        });
      }

      return result;
    }

    // Case 2: JSON string (complete service account JSON)
    if (typeof input === 'string' && (input.trim().startsWith('{') || input.includes('client_email'))) {
      this.diagnostics.detectedFormat = 'json_string';

      try {
        const parsed = JSON.parse(input);
        result.email = parsed.client_email;
        result.privateKey = parsed.private_key;

        if (!result.email || !result.privateKey) {
          result.errors.push({
            message: 'JSON is missing required fields (client_email or private_key)',
            code: 'INCOMPLETE_JSON',
            suggestion: 'Ensure JSON contains both client_email and private_key fields'
          });
        }

        return result;
      } catch (error) {
        result.errors.push({
          message: `Failed to parse JSON: ${error.message}`,
          code: 'INVALID_JSON',
          suggestion: 'Verify JSON is properly formatted'
        });
        return result;
      }
    }

    // Case 3: Direct credentials object
    if (input.client_email && input.private_key) {
      this.diagnostics.detectedFormat = 'credentials_object';

      result.email = input.client_email;
      result.privateKey = input.private_key;
      return result;
    }

    // Case 4: Separate email and key
    if (input.email && (input.privateKey || input.private_key)) {
      this.diagnostics.detectedFormat = 'separate_fields';

      result.email = input.email;
      result.privateKey = input.privateKey || input.private_key;
      return result;
    }

    // Case 5: Base64-encoded complete JSON
    if (typeof input === 'string' && !input.includes('{') && !input.includes('BEGIN PRIVATE KEY')) {
      this.diagnostics.detectedFormat = 'base64_json';

      try {
        const decoded = Buffer.from(input, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);

        result.email = parsed.client_email;
        result.privateKey = parsed.private_key;

        result.warnings.push({
          message: 'Successfully decoded base64-encoded JSON',
          code: 'BASE64_JSON_DECODED'
        });

        return result;
      } catch (error) {
        // Not base64 JSON, continue to next case
      }
    }

    // Unknown format
    result.errors.push({
      message: 'Could not detect credential format',
      code: 'UNKNOWN_FORMAT',
      suggestion: 'Provide credentials as: 1) Environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY), 2) JSON string, 3) Credentials object {client_email, private_key}, or 4) Base64-encoded JSON',
      receivedType: typeof input,
      receivedKeys: typeof input === 'object' ? Object.keys(input) : null
    });

    return result;
  }

  /**
   * Parse and normalize private key from various formats
   * @private
   */
  parsePrivateKey(rawKey) {
    const result = {
      key: null,
      errors: [],
      warnings: []
    };

    this.diagnostics.validationSteps.push('parse_private_key');

    if (!rawKey) {
      result.errors.push({
        message: 'Private key is null or undefined',
        code: 'NULL_PRIVATE_KEY',
        suggestion: 'Ensure private key is provided'
      });
      return result;
    }

    let processedKey = rawKey;

    // Track original format
    const originalLength = rawKey.length;
    const hasBackslashN = rawKey.includes('\\n');
    const hasActualNewlines = rawKey.includes('\n');
    const isBase64 = !rawKey.includes('BEGIN PRIVATE KEY') && rawKey.length > 100;

    // Step 1: Try base64 decoding if it looks like base64
    if (isBase64) {
      try {
        processedKey = Buffer.from(rawKey, 'base64').toString('utf8');
        this.diagnostics.transformationsApplied.push('base64_decode');

        result.warnings.push({
          message: 'Decoded base64-encoded private key',
          code: 'BASE64_DECODED',
          originalLength,
          decodedLength: processedKey.length
        });
      } catch (error) {
        result.errors.push({
          message: 'Key appears to be base64 but failed to decode',
          code: 'BASE64_DECODE_FAILED',
          suggestion: 'Verify the key is valid base64',
          error: error.message
        });
        return result;
      }
    }

    // Step 2: Handle escaped newlines (\\n to \n)
    if (processedKey.includes('\\n')) {
      processedKey = processedKey.replace(/\\n/g, '\n');
      this.diagnostics.transformationsApplied.push('unescape_newlines');

      result.warnings.push({
        message: 'Converted escaped newlines (\\n) to actual newlines',
        code: 'UNESCAPED_NEWLINES'
      });
    }

    // Step 3: Handle double-escaped newlines (\\\\n to \n)
    if (processedKey.includes('\\\\n')) {
      processedKey = processedKey.replace(/\\\\n/g, '\n');
      this.diagnostics.transformationsApplied.push('unescape_double_newlines');

      result.warnings.push({
        message: 'Converted double-escaped newlines (\\\\n) to actual newlines',
        code: 'UNESCAPED_DOUBLE_NEWLINES'
      });
    }

    // Step 4: Trim whitespace
    processedKey = processedKey.trim();

    // Step 5: Remove surrounding quotes
    if ((processedKey.startsWith('"') && processedKey.endsWith('"')) ||
        (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
      processedKey = processedKey.slice(1, -1);
      this.diagnostics.transformationsApplied.push('remove_quotes');

      result.warnings.push({
        message: 'Removed surrounding quotes from private key',
        code: 'QUOTES_REMOVED'
      });
    }

    // Step 6: Handle JSON-encoded strings (check for extra escaping)
    try {
      const jsonParsed = JSON.parse(`"${processedKey}"`);
      if (jsonParsed !== processedKey && jsonParsed.includes('BEGIN PRIVATE KEY')) {
        processedKey = jsonParsed;
        this.diagnostics.transformationsApplied.push('json_unescape');

        result.warnings.push({
          message: 'Unescaped JSON-encoded private key',
          code: 'JSON_UNESCAPED'
        });
      }
    } catch (error) {
      // Not JSON-encoded, continue
    }

    // Step 7: Normalize line endings (CRLF to LF)
    if (processedKey.includes('\r\n')) {
      processedKey = processedKey.replace(/\r\n/g, '\n');
      this.diagnostics.transformationsApplied.push('normalize_line_endings');
    }

    // Step 8: Final trim
    processedKey = processedKey.trim();

    result.key = processedKey;
    return result;
  }

  /**
   * Validate email format
   * @private
   */
  validateEmail(email) {
    const result = {
      errors: [],
      warnings: []
    };

    this.diagnostics.validationSteps.push('validate_email');

    if (!email) {
      result.errors.push({
        message: 'Service account email is missing',
        code: 'MISSING_EMAIL',
        suggestion: 'Provide the service account email from your JSON key file'
      });
      return result;
    }

    // Check basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      result.errors.push({
        message: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
        suggestion: 'Email should be in format: name@project.iam.gserviceaccount.com',
        receivedEmail: email
      });
      return result;
    }

    // Check if it's a service account email
    if (!email.includes('gserviceaccount.com') && !email.includes('developer.gserviceaccount.com')) {
      result.warnings.push({
        message: 'Email does not appear to be a Google service account',
        code: 'NON_SERVICE_ACCOUNT_EMAIL',
        suggestion: 'Service accounts typically end with @*.iam.gserviceaccount.com',
        receivedEmail: email
      });
    }

    return result;
  }

  /**
   * Validate private key structure
   * @private
   */
  validateKeyStructure(key) {
    const result = {
      errors: [],
      warnings: []
    };

    this.diagnostics.validationSteps.push('validate_key_structure');

    // Check for BEGIN marker
    if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
      result.errors.push({
        message: 'Private key missing BEGIN marker',
        code: 'MISSING_BEGIN_MARKER',
        suggestion: 'Private key must start with -----BEGIN PRIVATE KEY-----',
        keyPreview: key.substring(0, 50)
      });
    }

    // Check for END marker
    if (!key.includes('-----END PRIVATE KEY-----')) {
      result.errors.push({
        message: 'Private key missing END marker',
        code: 'MISSING_END_MARKER',
        suggestion: 'Private key must end with -----END PRIVATE KEY-----',
        keyPreview: key.substring(Math.max(0, key.length - 50))
      });
    }

    // Check key length
    if (key.length < this.options.minKeyLength) {
      result.errors.push({
        message: `Private key too short (${key.length} chars)`,
        code: 'KEY_TOO_SHORT',
        suggestion: `Key should be at least ${this.options.minKeyLength} characters (typical: 1600-1700)`,
        actualLength: key.length,
        expectedMinLength: this.options.minKeyLength
      });
    }

    if (key.length > this.options.maxKeyLength) {
      result.warnings.push({
        message: `Private key unusually long (${key.length} chars)`,
        code: 'KEY_TOO_LONG',
        suggestion: 'Verify there are no extra characters appended',
        actualLength: key.length,
        expectedMaxLength: this.options.maxKeyLength
      });
    }

    // Check for proper base64 content between markers
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';

    const beginIndex = key.indexOf(beginMarker);
    const endIndex = key.indexOf(endMarker);

    if (beginIndex !== -1 && endIndex !== -1) {
      const keyContent = key.substring(beginIndex + beginMarker.length, endIndex).trim();
      const base64Regex = /^[A-Za-z0-9+/\s=]+$/;

      if (!base64Regex.test(keyContent)) {
        result.errors.push({
          message: 'Private key contains invalid characters',
          code: 'INVALID_KEY_CONTENT',
          suggestion: 'Key content should only contain base64 characters (A-Z, a-z, 0-9, +, /, =)',
          invalidChars: keyContent.replace(/[A-Za-z0-9+/\s=]/g, '')
        });
      }

      // Check if key has proper line breaks (should have multiple lines)
      const lines = keyContent.split('\n').filter(line => line.trim().length > 0);
      if (lines.length < 10) {
        result.warnings.push({
          message: 'Private key has fewer lines than expected',
          code: 'FEW_KEY_LINES',
          suggestion: 'Key should typically span 20-30 lines',
          actualLines: lines.length
        });
      }
    }

    // Check for common mistakes
    if (key.includes('BEGIN RSA PRIVATE KEY')) {
      result.errors.push({
        message: 'Wrong key format: RSA PRIVATE KEY instead of PRIVATE KEY',
        code: 'WRONG_KEY_TYPE',
        suggestion: 'Google service accounts use PKCS#8 format (BEGIN PRIVATE KEY), not PKCS#1 (BEGIN RSA PRIVATE KEY). Convert with: openssl pkcs8 -topk8 -nocrypt -in key.pem'
      });
    }

    if (key.includes('BEGIN CERTIFICATE')) {
      result.errors.push({
        message: 'This appears to be a certificate, not a private key',
        code: 'CERTIFICATE_NOT_KEY',
        suggestion: 'Use the private_key field from your service account JSON, not a certificate'
      });
    }

    return result;
  }

  /**
   * Test authentication with Google APIs
   * @private
   */
  async testAuthentication(credentials) {
    const result = {
      errors: [],
      warnings: []
    };

    this.diagnostics.validationSteps.push('test_authentication');

    try {
      // Create auth client
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      // Get access token (this validates the credentials)
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();

      if (!tokenResponse.token) {
        result.errors.push({
          message: 'Failed to obtain access token',
          code: 'NO_ACCESS_TOKEN',
          suggestion: 'Credentials may be invalid or expired'
        });
        return result;
      }

      this.log('info', 'Successfully authenticated with Google APIs');

      // Check token expiration
      if (tokenResponse.res && tokenResponse.res.data) {
        const expiresIn = tokenResponse.res.data.expires_in;
        if (expiresIn) {
          result.warnings.push({
            message: `Token will expire in ${expiresIn} seconds`,
            code: 'TOKEN_EXPIRY',
            expiresIn
          });
        }
      }

    } catch (error) {
      // Parse Google API errors
      if (error.message.includes('invalid_grant')) {
        result.errors.push({
          message: 'Invalid grant: credentials are invalid or expired',
          code: 'INVALID_GRANT',
          suggestion: 'Regenerate your service account key from Google Cloud Console',
          googleError: error.message
        });
      } else if (error.message.includes('Invalid JWT')) {
        result.errors.push({
          message: 'Invalid JWT: private key format is incorrect',
          code: 'INVALID_JWT',
          suggestion: 'Verify the private key is properly formatted with correct line breaks',
          googleError: error.message
        });
      } else if (error.message.includes('PEM')) {
        result.errors.push({
          message: 'PEM parsing error: private key structure is malformed',
          code: 'PEM_ERROR',
          suggestion: 'Check that the key contains proper BEGIN/END markers and valid base64 content',
          googleError: error.message
        });
      } else {
        result.errors.push({
          message: `Authentication test failed: ${error.message}`,
          code: 'AUTH_TEST_FAILED',
          suggestion: 'Check Google Cloud Console for service account status',
          googleError: error.message,
          stack: error.stack
        });
      }
    }

    return result;
  }

  /**
   * Logger helper
   * @private
   */
  log(level, ...args) {
    if (this.options.logger && this.options.logger[level]) {
      this.options.logger[level](...args);
    }
  }

  /**
   * Generate a detailed diagnostic report
   */
  generateReport(validationResult) {
    const lines = [];

    lines.push('='.repeat(80));
    lines.push('GOOGLE SERVICE ACCOUNT CREDENTIAL VALIDATION REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push(`Status: ${validationResult.valid ? 'VALID ✓' : 'INVALID ✗'}`);
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`Validation Time: ${validationResult.diagnostics.timeElapsed}ms`);
    lines.push('');

    lines.push('DIAGNOSTICS:');
    lines.push(`  Detected Format: ${validationResult.diagnostics.detectedFormat || 'unknown'}`);
    lines.push(`  Transformations Applied: ${validationResult.diagnostics.transformationsApplied.join(', ') || 'none'}`);
    lines.push(`  Validation Steps: ${validationResult.diagnostics.validationSteps.join(' → ')}`);
    lines.push('');

    if (validationResult.errors.length > 0) {
      lines.push('ERRORS:');
      validationResult.errors.forEach((error, i) => {
        lines.push(`  ${i + 1}. [${error.code}] ${error.message}`);
        if (error.suggestion) {
          lines.push(`     💡 ${error.suggestion}`);
        }
        if (error.details) {
          lines.push(`     Details: ${JSON.stringify(error.details, null, 2)}`);
        }
      });
      lines.push('');
    }

    if (validationResult.warnings.length > 0) {
      lines.push('WARNINGS:');
      validationResult.warnings.forEach((warning, i) => {
        lines.push(`  ${i + 1}. [${warning.code}] ${warning.message}`);
      });
      lines.push('');
    }

    if (validationResult.valid && validationResult.credentials) {
      lines.push('CREDENTIALS:');
      lines.push(`  Email: ${validationResult.credentials.client_email}`);
      lines.push(`  Key Length: ${validationResult.credentials.private_key.length} chars`);
      lines.push(`  Key Preview: ${validationResult.credentials.private_key.substring(0, 50)}...`);
      lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

/**
 * Convenience function for quick validation
 * @param {Object} input - Credentials input
 * @param {Object} options - Validation options
 * @returns {Promise<ValidationResult>}
 */
async function validateCredentials(input, options = {}) {
  const validator = new GoogleCredentialsValidator(options);
  return await validator.validate(input);
}

/**
 * Validate credentials from environment variables
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @param {Object} options - Validation options
 * @returns {Promise<ValidationResult>}
 */
async function validateFromEnv(env = process.env, options = {}) {
  const validator = new GoogleCredentialsValidator(options);
  return await validator.validate({
    GOOGLE_SERVICE_ACCOUNT_EMAIL: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: env.GOOGLE_PRIVATE_KEY,
    GOOGLE_PRIVATE_KEY_BASE64: env.GOOGLE_PRIVATE_KEY_BASE64
  });
}

/**
 * Validate credentials from a JSON file
 * @param {string} jsonContent - JSON file content or path
 * @param {Object} options - Validation options
 * @returns {Promise<ValidationResult>}
 */
async function validateFromJSON(jsonContent, options = {}) {
  const validator = new GoogleCredentialsValidator(options);

  // Check if it's a file path
  if (typeof jsonContent === 'string' && !jsonContent.trim().startsWith('{')) {
    const fs = require('fs');
    try {
      jsonContent = fs.readFileSync(jsonContent, 'utf8');
    } catch (error) {
      return {
        valid: false,
        credentials: null,
        errors: [{
          message: `Failed to read JSON file: ${error.message}`,
          code: 'FILE_READ_ERROR',
          suggestion: 'Verify the file path is correct and the file is readable'
        }],
        warnings: [],
        diagnostics: validator.diagnostics
      };
    }
  }

  return await validator.validate(jsonContent);
}

module.exports = {
  GoogleCredentialsValidator,
  CredentialValidationError,
  validateCredentials,
  validateFromEnv,
  validateFromJSON
};
