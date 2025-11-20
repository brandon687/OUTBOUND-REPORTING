# Integrating the Google Credentials Validator

This guide shows how to replace the existing credential parsing logic in `server.js` with the bulletproof validator.

## Files Created

1. **`lib/google-credentials-validator.js`** - Main validator module
2. **`lib/google-credentials-validator.test.js`** - Comprehensive test suite
3. **`lib/google-credentials-validator.README.md`** - Full documentation
4. **`examples/credential-validation-example.js`** - Usage examples
5. **`examples/integrate-with-server.js`** - Server integration example

## Quick Integration Steps

### Step 1: Replace Current Logic in server.js

Find this section in `server.js` (lines 22-92):

```javascript
// Initialize Google Sheets client
let sheetsClient = null;
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && (process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY_BASE64)) {
    // Parse private key - handle different possible formats
    let privateKey = '';
    // ... current parsing logic ...
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Sheets client:', error.message);
}
```

Replace with:

```javascript
const { validateFromEnv } = require('./lib/google-credentials-validator');

// Initialize Google Sheets client
let sheetsClient = null;
let credentialValidationResult = null;

async function initializeGoogleSheets() {
  try {
    console.log('🔍 Validating Google credentials...');

    const result = await validateFromEnv(process.env, {
      strictMode: true,
      testAuthentication: true,
      logger: console
    });

    credentialValidationResult = result;

    if (!result.valid) {
      console.error('❌ Credential validation failed:');
      result.errors.forEach(error => {
        console.error(`  [${error.code}] ${error.message}`);
        if (error.suggestion) {
          console.error(`  💡 ${error.suggestion}`);
        }
      });
      throw new Error('Invalid credentials');
    }

    console.log('✓ Credentials validated successfully');

    const auth = new google.auth.GoogleAuth({
      credentials: result.credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('✓ Google Sheets API client initialized');

  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets:', error.message);
    console.warn('⚠️  Historical calendar view will not be available');
  }
}

// Call during server startup (make the startup async)
```

### Step 2: Update Server Startup

Change the server startup from:

```javascript
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // ...
});
```

To:

```javascript
async function startServer() {
  await initializeGoogleSheets();

  app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // ... rest of startup code
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

### Step 3: Add Diagnostic Endpoint

Add this endpoint to your server:

```javascript
app.get('/api/credentials/diagnose', async (req, res) => {
  const { GoogleCredentialsValidator, validateFromEnv } = require('./lib/google-credentials-validator');

  const result = await validateFromEnv(process.env, {
    testAuthentication: req.query.test_auth === 'true'
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
```

## Testing the Integration

### 1. Run Tests

```bash
# If you have Jest installed
npm test lib/google-credentials-validator.test.js

# Or run manual tests
node lib/google-credentials-validator.test.js
```

### 2. Run Examples

```bash
# Run all examples
node examples/credential-validation-example.js

# Run specific example (1-7)
node examples/credential-validation-example.js 1
node examples/credential-validation-example.js 2
# etc.
```

### 3. Test Server Integration

```bash
# Run the example server
node examples/integrate-with-server.js
```

Then test these endpoints:
- http://localhost:3000/api/health
- http://localhost:3000/api/status
- http://localhost:3000/api/credentials/validate
- http://localhost:3000/api/credentials/diagnose
- http://localhost:3000/api/sheets/test

## Environment Variables

The validator supports multiple formats. Choose the one that works best for your deployment:

### Option 1: Base64-Encoded Key (RECOMMENDED)

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...
```

To generate:
```bash
node encode-google-key.js path/to/service-account.json
```

### Option 2: Escaped Newlines

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

## What the Validator Provides

### Automatic Format Detection
- Environment variables
- JSON strings
- Base64-encoded JSON
- Credentials objects
- Separate fields

### Comprehensive Parsing
- Base64 decoding
- Escaped newline conversion (`\n` to actual newlines)
- Double-escaped newlines (`\\n`)
- Quote removal
- Whitespace trimming
- Line ending normalization (CRLF to LF)

### Validation
- Email format and service account detection
- Private key structure (BEGIN/END markers)
- Key length validation
- Key type detection (PKCS#8 vs PKCS#1)
- Certificate vs key detection
- Authentication testing (optional)

### Error Reporting
- Clear error messages with error codes
- Actionable suggestions
- Diagnostic information
- Detailed reports

## Migration Checklist

- [ ] Copy validator files to your project
  - [ ] `lib/google-credentials-validator.js`
  - [ ] `lib/google-credentials-validator.test.js` (optional)
  - [ ] `lib/google-credentials-validator.README.md` (optional)

- [ ] Install dependencies (already in package.json)
  - [ ] `googleapis`
  - [ ] `dotenv`

- [ ] Update `server.js`
  - [ ] Import validator
  - [ ] Replace credential parsing logic
  - [ ] Make server startup async
  - [ ] Add diagnostic endpoint

- [ ] Test locally
  - [ ] Run validator tests
  - [ ] Test with your credentials
  - [ ] Verify Google Sheets connection

- [ ] Update deployment
  - [ ] Set `GOOGLE_PRIVATE_KEY_BASE64` (recommended)
  - [ ] Or keep `GOOGLE_PRIVATE_KEY` (with proper escaping)
  - [ ] Deploy and test

- [ ] Monitor in production
  - [ ] Check `/api/credentials/diagnose` endpoint
  - [ ] Review server logs during startup
  - [ ] Test `/api/historical/test` endpoint

## Benefits

### Before (Current Implementation)
- Manual string parsing
- Limited error messages
- Hard to debug failures
- No validation of key structure
- No authentication testing

### After (With Validator)
- Automatic format detection
- Comprehensive validation
- Detailed error messages with suggestions
- Diagnostic reports
- Authentication testing
- Production-ready error handling

## Troubleshooting

### Issue: Validator not found

**Error**: `Cannot find module './lib/google-credentials-validator'`

**Fix**:
```bash
mkdir -p lib
# Copy google-credentials-validator.js to lib/
```

### Issue: Authentication fails

**Error**: `INVALID_JWT` or `INVALID_GRANT`

**Fix**:
1. Check `/api/credentials/diagnose`
2. Look for transformations applied
3. Try base64 encoding: `node encode-google-key.js service-account.json`

### Issue: Key structure errors

**Error**: `MISSING_BEGIN_MARKER` or `KEY_TOO_SHORT`

**Fix**:
1. Verify you copied the entire private key
2. Check for truncation in environment variables
3. Use base64 encoding to avoid newline issues

### Issue: Works locally, fails in production

**Cause**: Environment variable handling differences

**Fix**:
1. Always use `GOOGLE_PRIVATE_KEY_BASE64` in production
2. Check platform-specific escaping requirements
3. Use the diagnostic endpoint to compare environments

## Advanced Usage

### Custom Validation

Extend the validator for project-specific requirements:

```javascript
const { GoogleCredentialsValidator } = require('./lib/google-credentials-validator');

class ProjectValidator extends GoogleCredentialsValidator {
  async validate(input) {
    const result = await super.validate(input);

    if (result.valid) {
      // Add custom checks
      const email = result.credentials.client_email;

      if (!email.includes('my-project-id')) {
        result.valid = false;
        result.errors.push({
          message: 'Wrong project',
          code: 'WRONG_PROJECT',
          suggestion: 'Use service account from my-project-id'
        });
      }
    }

    return result;
  }
}
```

### Disable Authentication Testing

For faster startup (but less thorough validation):

```javascript
const result = await validateFromEnv(process.env, {
  testAuthentication: false
});
```

### Custom Logger

Integrate with your logging system:

```javascript
const winston = require('winston');

const result = await validateFromEnv(process.env, {
  logger: winston
});
```

## Complete Example

See `examples/integrate-with-server.js` for a complete working example with:
- Full server integration
- Error handling
- Diagnostic endpoints
- Startup checks
- Connection testing

## Next Steps

1. Review the full documentation: `lib/google-credentials-validator.README.md`
2. Run the examples: `node examples/credential-validation-example.js`
3. Test the integration: `node examples/integrate-with-server.js`
4. Integrate into your `server.js`
5. Deploy and monitor

## Support

For validator issues:
- Check error code in `lib/google-credentials-validator.README.md`
- Run examples to understand behavior
- Use diagnostic endpoint: `/api/credentials/diagnose`
- Review test cases in `lib/google-credentials-validator.test.js`

For Google Cloud Platform issues:
- [Service Account Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)
