# Google Service Account Credentials Validator

A bulletproof, production-ready credential validation system for Google service account credentials with comprehensive error handling, format detection, and diagnostic reporting.

## Features

- **Multi-Format Support**: Automatically detects and parses credentials from various input formats
  - Environment variables (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_PRIVATE_KEY_BASE64`)
  - JSON strings (complete service account JSON)
  - Credentials objects (`{client_email, private_key}`)
  - Base64-encoded JSON
  - Separate fields (`{email, privateKey}`)

- **Robust Parsing**: Handles all edge cases
  - Base64-encoded keys
  - Escaped newlines (`\n` to actual newlines)
  - Double-escaped newlines (`\\n`)
  - Quoted strings (single and double quotes)
  - Windows CRLF line endings
  - JSON-encoded strings
  - Whitespace trimming

- **Comprehensive Validation**
  - Email format and service account validation
  - Private key structure (BEGIN/END markers, length, content)
  - Key type detection (PKCS#8 vs PKCS#1)
  - Certificate vs key detection
  - Optional authentication testing with Google APIs

- **Detailed Error Reporting**
  - Clear error messages with error codes
  - Actionable suggestions for fixing issues
  - Diagnostic information (detected format, transformations applied)
  - Warnings for non-critical issues

## Installation

```bash
npm install googleapis
```

Place the validator in your project:
```bash
mkdir -p lib
# Copy google-credentials-validator.js to lib/
```

## Quick Start

### Basic Usage

```javascript
const { validateCredentials } = require('./lib/google-credentials-validator');

// Validate from environment variables
const result = await validateCredentials({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
});

if (result.valid) {
  console.log('✓ Credentials are valid!');
  // Use result.credentials with Google APIs
  const { client_email, private_key } = result.credentials;
} else {
  console.error('✗ Validation failed:');
  result.errors.forEach(error => {
    console.error(`  [${error.code}] ${error.message}`);
    if (error.suggestion) {
      console.error(`  💡 ${error.suggestion}`);
    }
  });
}
```

### Validate from Environment

```javascript
const { validateFromEnv } = require('./lib/google-credentials-validator');

const result = await validateFromEnv(); // Uses process.env by default

// Or provide custom environment
const result = await validateFromEnv({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: '...',
  GOOGLE_PRIVATE_KEY_BASE64: '...'
});
```

### Validate from JSON File

```javascript
const { validateFromJSON } = require('./lib/google-credentials-validator');

// From file path
const result = await validateFromJSON('./path/to/service-account.json');

// From JSON string
const jsonString = fs.readFileSync('./service-account.json', 'utf8');
const result = await validateFromJSON(jsonString);
```

### Advanced Usage with Options

```javascript
const { GoogleCredentialsValidator } = require('./lib/google-credentials-validator');

const validator = new GoogleCredentialsValidator({
  strictMode: true,              // Strict validation (default: true)
  testAuthentication: true,      // Test actual authentication (default: true)
  minKeyLength: 1600,            // Minimum key length (default: 1600)
  maxKeyLength: 4096,            // Maximum key length (default: 4096)
  logger: console                // Custom logger (default: console)
});

const result = await validator.validate(input);

// Generate detailed report
const report = validator.generateReport(result);
console.log(report);
```

## Supported Input Formats

### Format 1: Environment Variables

```javascript
const result = await validateCredentials({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service-account@project.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
});
```

### Format 2: Base64-Encoded Key (Recommended for Environment Variables)

```javascript
const result = await validateCredentials({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service-account@project.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY_BASE64: 'LS0tLS1CRUdJTi...' // Base64-encoded key
});
```

### Format 3: JSON String

```javascript
const jsonString = `{
  "type": "service_account",
  "project_id": "my-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}`;

const result = await validateCredentials(jsonString);
```

### Format 4: Credentials Object

```javascript
const result = await validateCredentials({
  client_email: 'service-account@project.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
});
```

### Format 5: Separate Fields

```javascript
const result = await validateCredentials({
  email: 'service-account@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
});
```

### Format 6: Base64-Encoded Complete JSON

```javascript
// Entire service account JSON encoded as base64
const base64Json = Buffer.from(JSON.stringify(serviceAccountJson)).toString('base64');
const result = await validateCredentials(base64Json);
```

## Output Format

### Validation Result Object

```javascript
{
  valid: boolean,              // Overall validation status
  credentials: {               // Parsed credentials (if valid)
    client_email: string,
    private_key: string,
    type: 'service_account'
  } | null,
  errors: [                    // Array of validation errors
    {
      message: string,         // Human-readable error message
      code: string,            // Error code (e.g., 'MISSING_EMAIL')
      suggestion: string,      // How to fix the error
      ...additionalDetails     // Error-specific details
    }
  ],
  warnings: [                  // Array of warnings
    {
      message: string,
      code: string,
      ...additionalDetails
    }
  ],
  diagnostics: {               // Diagnostic information
    detectedFormat: string,    // Detected input format
    transformationsApplied: [], // List of transformations
    validationSteps: [],       // Validation steps performed
    timeElapsed: number        // Validation time in ms
  }
}
```

## Error Codes

### Extraction Errors

- `MISSING_EMAIL` - Service account email is missing
- `MISSING_PRIVATE_KEY` - Private key is missing
- `UNKNOWN_FORMAT` - Could not detect input format
- `INVALID_JSON` - JSON parsing failed
- `INCOMPLETE_JSON` - JSON missing required fields

### Private Key Errors

- `NULL_PRIVATE_KEY` - Private key is null or undefined
- `BASE64_DECODE_FAILED` - Base64 decoding failed
- `MISSING_BEGIN_MARKER` - Key missing `-----BEGIN PRIVATE KEY-----`
- `MISSING_END_MARKER` - Key missing `-----END PRIVATE KEY-----`
- `KEY_TOO_SHORT` - Key is too short (< 1600 chars)
- `INVALID_KEY_CONTENT` - Key contains invalid characters
- `WRONG_KEY_TYPE` - Using RSA format instead of PKCS#8
- `CERTIFICATE_NOT_KEY` - Provided certificate instead of key

### Email Errors

- `INVALID_EMAIL_FORMAT` - Email format is invalid

### Authentication Errors

- `NO_ACCESS_TOKEN` - Failed to obtain access token
- `INVALID_GRANT` - Credentials invalid or expired
- `INVALID_JWT` - Private key format incorrect
- `PEM_ERROR` - Private key structure malformed
- `AUTH_TEST_FAILED` - Authentication test failed

### Warning Codes

- `USING_BASE64` - Using base64-encoded key (recommended)
- `BASE64_DECODED` - Successfully decoded base64 key
- `UNESCAPED_NEWLINES` - Converted escaped newlines
- `QUOTES_REMOVED` - Removed surrounding quotes
- `NON_SERVICE_ACCOUNT_EMAIL` - Email doesn't look like service account
- `KEY_TOO_LONG` - Key unusually long
- `FEW_KEY_LINES` - Key has fewer lines than expected

## Example: Integration with Express Server

```javascript
const express = require('express');
const { google } = require('googleapis');
const { validateFromEnv } = require('./lib/google-credentials-validator');

const app = express();

// Initialize Google Sheets on startup
let sheetsClient = null;

async function initializeGoogleSheets() {
  console.log('Validating Google credentials...');

  const result = await validateFromEnv(process.env, {
    testAuthentication: true,  // Test real authentication
    logger: console
  });

  if (!result.valid) {
    console.error('❌ Google Sheets initialization failed:');
    result.errors.forEach(error => {
      console.error(`  [${error.code}] ${error.message}`);
      if (error.suggestion) {
        console.error(`  💡 ${error.suggestion}`);
      }
    });

    // Generate detailed report
    const validator = new GoogleCredentialsValidator();
    console.log('\n' + validator.generateReport(result));

    throw new Error('Invalid Google credentials');
  }

  console.log('✓ Google credentials validated successfully');

  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach(warning => {
      console.warn(`  [${warning.code}] ${warning.message}`);
    });
  }

  // Create Google Sheets client
  const auth = new google.auth.GoogleAuth({
    credentials: result.credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  console.log('✓ Google Sheets client initialized');
}

// Diagnostic endpoint
app.get('/api/credentials/validate', async (req, res) => {
  const result = await validateFromEnv(process.env, {
    testAuthentication: true
  });

  const validator = new GoogleCredentialsValidator();
  const report = validator.generateReport(result);

  res.json({
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    diagnostics: result.diagnostics,
    report: report
  });
});

// Start server
app.listen(3000, async () => {
  console.log('Server starting...');

  try {
    await initializeGoogleSheets();
    console.log('✓ Server ready on port 3000');
  } catch (error) {
    console.error('Failed to initialize:', error.message);
    process.exit(1);
  }
});
```

## Example: Encoding Private Key for Environment Variables

```javascript
const { validateCredentials } = require('./lib/google-credentials-validator');
const fs = require('fs');

// Read service account JSON
const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

// Method 1: Use base64-encoded key (RECOMMENDED)
const base64Key = Buffer.from(serviceAccount.private_key).toString('base64');

console.log('Set these environment variables:');
console.log(`GOOGLE_SERVICE_ACCOUNT_EMAIL=${serviceAccount.client_email}`);
console.log(`GOOGLE_PRIVATE_KEY_BASE64=${base64Key}`);

// Method 2: Use escaped key
const escapedKey = serviceAccount.private_key.replace(/\n/g, '\\n');
console.log(`GOOGLE_PRIVATE_KEY="${escapedKey}"`);

// Validate both methods
const result1 = await validateCredentials({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: serviceAccount.client_email,
  GOOGLE_PRIVATE_KEY_BASE64: base64Key
});

const result2 = await validateCredentials({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: serviceAccount.client_email,
  GOOGLE_PRIVATE_KEY: escapedKey
});

console.log('Base64 method:', result1.valid ? '✓' : '✗');
console.log('Escaped method:', result2.valid ? '✓' : '✗');
```

## Testing

Run the test suite:

```bash
# If you have Jest installed
npm test

# Or run manual tests
node lib/google-credentials-validator.test.js
```

Test coverage includes:
- All input format detection
- All transformation types
- Email validation
- Key structure validation
- Error handling
- Edge cases (empty input, malformed data, etc.)

## Common Issues and Solutions

### Issue: "Private key missing BEGIN marker"

**Cause**: Key doesn't start with `-----BEGIN PRIVATE KEY-----`

**Solutions**:
1. Copy the complete key including BEGIN and END markers
2. Use base64 encoding: `Buffer.from(key).toString('base64')`
3. Check for corruption during copy/paste

### Issue: "Invalid JWT" during authentication

**Cause**: Newlines in private key not properly formatted

**Solutions**:
1. Use `GOOGLE_PRIVATE_KEY_BASE64` instead of `GOOGLE_PRIVATE_KEY`
2. Ensure literal `\n` in the key string: `"-----BEGIN...\\n...\\n-----END...\\n"`
3. Don't double-escape: Use `\n` not `\\n` in JSON

### Issue: "Key too short"

**Cause**: Key was truncated or partially copied

**Solutions**:
1. Download fresh service account JSON from Google Cloud Console
2. Copy the entire `private_key` field value
3. Verify key is ~1600-1700 characters

### Issue: "Wrong key type: RSA PRIVATE KEY"

**Cause**: Using PKCS#1 format instead of PKCS#8

**Solutions**:
1. Google service accounts use PKCS#8 (BEGIN PRIVATE KEY)
2. Convert if needed: `openssl pkcs8 -topk8 -nocrypt -in key.pem`
3. Download new key from Google Cloud Console

### Issue: "The caller does not have permission" (after validation passes)

**Cause**: Credentials valid but service account not granted access

**Solutions**:
1. Share the Google Sheet with the service account email
2. Grant appropriate permissions (Viewer for read-only)
3. Enable required APIs in Google Cloud Console

## Best Practices

1. **Use Base64 Encoding**: Always prefer `GOOGLE_PRIVATE_KEY_BASE64` over `GOOGLE_PRIVATE_KEY`
   - Avoids newline issues in environment variables
   - Platform-independent
   - Safer for copy/paste

2. **Validate on Startup**: Validate credentials when your application starts
   - Fail fast if credentials are invalid
   - Provides clear error messages before production issues

3. **Enable Authentication Testing**: Use `testAuthentication: true` in production
   - Catches expired or revoked credentials
   - Verifies actual Google API connectivity

4. **Monitor Warnings**: Don't ignore warnings
   - May indicate future issues
   - Can help optimize credential handling

5. **Use Diagnostic Reports**: Generate reports for troubleshooting
   - Helps debug complex credential issues
   - Useful for support tickets

6. **Never Commit Credentials**:
   - Add `*.json` and `.env` to `.gitignore`
   - Use environment variables in production
   - Rotate keys if accidentally committed

7. **Set Minimal Permissions**:
   - Grant only required scopes
   - Use read-only access when possible
   - Review service account permissions regularly

## Environment Variable Setup

### Development (.env file)

```bash
# Option 1: Base64-encoded key (RECOMMENDED)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...

# Option 2: Escaped key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

### Production (Railway, Heroku, etc.)

1. **Railway**:
   - Go to Variables tab
   - Add `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - Add `GOOGLE_PRIVATE_KEY_BASE64`
   - Redeploy

2. **Heroku**:
   ```bash
   heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL="..."
   heroku config:set GOOGLE_PRIVATE_KEY_BASE64="..."
   ```

3. **Docker**:
   ```dockerfile
   ENV GOOGLE_SERVICE_ACCOUNT_EMAIL=...
   ENV GOOGLE_PRIVATE_KEY_BASE64=...
   ```

## API Reference

### Classes

#### `GoogleCredentialsValidator`

Main validator class with full configuration options.

**Constructor Options**:
- `strictMode` (boolean, default: true) - Enable strict validation
- `testAuthentication` (boolean, default: true) - Test actual Google authentication
- `minKeyLength` (number, default: 1600) - Minimum private key length
- `maxKeyLength` (number, default: 4096) - Maximum private key length
- `logger` (object, default: console) - Custom logger instance

**Methods**:
- `async validate(input)` - Validate credentials, returns ValidationResult
- `generateReport(validationResult)` - Generate detailed text report

### Functions

#### `async validateCredentials(input, options)`

Quick validation with automatic format detection.

**Parameters**:
- `input` (Object|string) - Credentials in any supported format
- `options` (Object) - Validation options (same as constructor)

**Returns**: Promise<ValidationResult>

#### `async validateFromEnv(env, options)`

Validate from environment variables.

**Parameters**:
- `env` (Object, default: process.env) - Environment variables object
- `options` (Object) - Validation options

**Returns**: Promise<ValidationResult>

#### `async validateFromJSON(jsonContent, options)`

Validate from JSON file or string.

**Parameters**:
- `jsonContent` (string) - JSON string or file path
- `options` (Object) - Validation options

**Returns**: Promise<ValidationResult>

## Contributing

This validator is designed to be extended. To add custom validation:

```javascript
class CustomValidator extends GoogleCredentialsValidator {
  async validate(input) {
    const result = await super.validate(input);

    // Add custom validation
    if (result.valid) {
      // Your custom checks here
    }

    return result;
  }
}
```

## License

MIT

## Support

For issues specific to Google Cloud Platform:
- [Google Cloud Console](https://console.cloud.google.com/)
- [Service Account Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)

For issues with this validator:
- Check the error code and suggestion
- Generate a diagnostic report
- Review the common issues section above
