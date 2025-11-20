# Test Matrix Reference: Google Sheets Credential Parser

## Quick Reference Matrix

This document provides a quick lookup for each test scenario with input/output examples.

---

## Category 1: Valid Inputs ✅

### 1.1 Base64-Encoded Key

**Input:**
```javascript
{
  email: 'test-service@project-123.iam.gserviceaccount.com',
  privateKey: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUVWUUF...' // base64
}
```

**Expected Output:**
```javascript
{
  valid: true,
  credentials: { client_email: '...', private_key: '-----BEGIN PRIVATE KEY-----\n...' },
  errors: [],
  warnings: [
    { code: 'BASE64_DECODED', message: 'Decoded base64-encoded private key', originalLength: 2048, decodedLength: 1675 }
  ],
  diagnostics: {
    detectedFormat: 'separate_fields',
    transformationsApplied: ['base64_decode'],
    validationSteps: ['extract_credentials', 'parse_private_key', 'validate_email', 'validate_key_structure'],
    timeElapsed: 15
  }
}
```

**Expected Logs:**
- "Decoded base64-encoded private key"
- "Successfully validated credentials"

---

### 1.2 Plain Key with Literal \n

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADAN...'  // literal \n
}
```

**Expected Output:**
```javascript
{
  valid: true,
  warnings: [
    { code: 'UNESCAPED_NEWLINES', message: 'Converted escaped newlines (\\n) to actual newlines' }
  ],
  diagnostics: {
    transformationsApplied: ['unescape_newlines']
  }
}
```

**Expected Logs:**
- "Converting escaped newlines (\\n) to actual newlines"

---

### 1.3 Plain Key with Actual Newlines

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0...
-----END PRIVATE KEY-----`
}
```

**Expected Output:**
```javascript
{
  valid: true,
  warnings: [],
  diagnostics: {
    transformationsApplied: []  // No transformations needed
  }
}
```

---

### 1.4 Key with Surrounding Quotes

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '"-----BEGIN PRIVATE KEY-----\nMIIE..."'
}
```

**Expected Output:**
```javascript
{
  valid: true,
  warnings: [
    { code: 'QUOTES_REMOVED', message: 'Removed surrounding quotes from private key' }
  ],
  diagnostics: {
    transformationsApplied: ['remove_quotes']
  }
}
```

---

### 1.5 Key with Extra Whitespace

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '  \n  -----BEGIN PRIVATE KEY-----\n...\n  '
}
```

**Expected Output:**
```javascript
{
  valid: true,
  warnings: [],
  diagnostics: {
    transformationsApplied: []  // Trimming is implicit
  }
}
```

---

## Category 2: Invalid Inputs ❌

### 2.1 Empty GOOGLE_PRIVATE_KEY_BASE64

**Input:**
```javascript
{
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@project.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY_BASE64: ''
}
```

**Expected Output:**
```javascript
{
  valid: false,
  credentials: null,
  errors: [
    {
      code: 'MISSING_PRIVATE_KEY',
      message: 'Private key is missing (checked GOOGLE_PRIVATE_KEY_BASE64 and GOOGLE_PRIVATE_KEY)',
      suggestion: 'Set either GOOGLE_PRIVATE_KEY_BASE64 (recommended) or GOOGLE_PRIVATE_KEY'
    }
  ],
  diagnostics: {
    detectedFormat: 'environment_variables'
  }
}
```

**Expected Logs:**
- "Private key is missing"

---

### 2.2 Invalid Base64 Characters

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: 'Not!Valid@Base64#String$With%Invalid^Chars'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'MISSING_BEGIN_MARKER',
      message: 'Private key missing BEGIN marker',
      suggestion: 'Private key must start with -----BEGIN PRIVATE KEY-----',
      keyPreview: 'Not!Valid@Base64#String$With%Invalid^Chars'
    }
  ]
}
```

---

### 2.3 Base64 of Wrong Field (Email)

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: 'dGVzdEBwcm9qZWN0LmlhbS5nc2VydmljZWFjY291bnQuY29t'  // base64 of email
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'MISSING_BEGIN_MARKER',
      message: 'Private key missing BEGIN marker',
      keyPreview: 'test@project.iam.gserviceaccount.com'  // decoded value
    }
  ],
  diagnostics: {
    transformationsApplied: ['base64_decode']
  }
}
```

**Expected Logs:**
- "Decoded base64 but result doesn't look like a key"

---

### 2.4 Truncated Key - Missing BEGIN

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: 'MIIEvQIBADANBgkqhkiG9w0...\n-----END PRIVATE KEY-----'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'MISSING_BEGIN_MARKER',
      message: 'Private key missing BEGIN marker',
      suggestion: 'Private key must start with -----BEGIN PRIVATE KEY-----',
      keyPreview: 'MIIEvQIBADANBgkqhkiG9w0...'
    }
  ]
}
```

---

### 2.5 Truncated Key - Missing END

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0...'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'MISSING_END_MARKER',
      message: 'Private key missing END marker',
      suggestion: 'Private key must end with -----END PRIVATE KEY-----',
      keyPreview: '...kqhkiG9w0'  // last 50 chars
    }
  ]
}
```

---

### 2.6 Key Too Short

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\nabcdefg\n-----END PRIVATE KEY-----'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'KEY_TOO_SHORT',
      message: 'Private key too short (67 chars)',
      suggestion: 'Key should be at least 1600 characters (typical: 1600-1700)',
      actualLength: 67,
      expectedMinLength: 1600
    }
  ]
}
```

---

### 2.7 Double-Encoded Key

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: 'TFMwdExTMUNSVWRKVGlCUVVrbFdRVlJGSUV0RldTMHRMUzB0Q2swPQ=='  // double base64
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'MISSING_BEGIN_MARKER',
      message: 'Private key missing BEGIN marker',
      keyPreview: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk0=',  // decoded once, still base64
      suggestion: 'The decoded value appears to be base64-encoded again. Re-encode from original JSON.'
    }
  ]
}
```

---

### 2.8 Wrong Key Type (RSA)

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIB...'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'WRONG_KEY_TYPE',
      message: 'Wrong key format: RSA PRIVATE KEY instead of PRIVATE KEY',
      suggestion: 'Google service accounts use PKCS#8 format (BEGIN PRIVATE KEY), not PKCS#1 (BEGIN RSA PRIVATE KEY). Convert with: openssl pkcs8 -topk8 -nocrypt -in key.pem'
    }
  ]
}
```

---

### 2.9 Certificate Instead of Key

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN CERTIFICATE-----\nMIIDXTCCA...'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'CERTIFICATE_NOT_KEY',
      message: 'This appears to be a certificate, not a private key',
      suggestion: 'Use the private_key field from your service account JSON, not a certificate'
    }
  ]
}
```

---

## Category 3: Malicious Inputs 🛡️

### 3.1 SQL Injection in Email

**Input:**
```javascript
{
  email: "'; DROP TABLE users; --",
  privateKey: VALID_PRIVATE_KEY
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'INVALID_EMAIL_FORMAT',
      message: 'Invalid email format',
      receivedEmail: "'; DROP TABLE users; --"
    }
  ]
}
```

**Security Validation:**
- ✅ No database queries executed
- ✅ String handled safely
- ✅ No SQL injection

---

### 3.2 XSS in Email

**Input:**
```javascript
{
  email: '<script>alert("xss")</script>@example.com',
  privateKey: VALID_PRIVATE_KEY
}
```

**Expected Output:**
```javascript
{
  valid: true,  // Passes basic email regex (permissive)
  warnings: [
    { code: 'NON_SERVICE_ACCOUNT_EMAIL', message: 'Email does not appear to be a Google service account' }
  ]
}
```

**Security Validation:**
- ✅ No script execution
- ✅ Treated as literal string
- ⚠️ Email regex is permissive (not a security issue, just validation)

**Note:** While this passes basic validation, it would fail:
1. The service account check (not ending in gserviceaccount.com)
2. Real authentication (not a valid Google email)

---

### 3.3 Path Traversal

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '../../../etc/passwd'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'MISSING_BEGIN_MARKER', message: 'Private key missing BEGIN marker' }
  ]
}
```

**Security Validation:**
- ✅ No file system access
- ✅ Treated as literal string
- ✅ No path traversal vulnerability

---

### 3.4 Buffer Overflow Attempt

**Input:**
```javascript
{
  email: 'a'.repeat(100000) + '@example.com',
  privateKey: VALID_PRIVATE_KEY + 'a'.repeat(100000)
}
```

**Expected Output:**
```javascript
{
  valid: false,  // or true with warnings
  warnings: [
    { code: 'KEY_TOO_LONG', actualLength: 101675 }
  ]
}
```

**Security Validation:**
- ✅ No crashes
- ✅ Handles large strings gracefully
- ✅ No memory issues

---

### 3.5 Null Byte Injection

**Input:**
```javascript
{
  email: 'test\x00@example.com',
  privateKey: 'key\x00content'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'INVALID_EMAIL_FORMAT' or 'MISSING_BEGIN_MARKER' }
  ]
}
```

**Security Validation:**
- ✅ Null bytes handled safely
- ✅ No truncation issues

---

## Category 4: Edge Cases 🔍

### 4.1 Both Keys Set (Base64 Wins)

**Input:**
```javascript
{
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@project.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: 'wrong-key-content',
  GOOGLE_PRIVATE_KEY_BASE64: 'LS0tLS1CRUdJTi...'  // correct key
}
```

**Expected Output:**
```javascript
{
  valid: true,
  warnings: [
    { code: 'USING_BASE64', message: 'Using base64-encoded key (recommended)' }
  ]
}
```

**Behavior:** Base64 version takes precedence, plain key is ignored

---

### 4.2 Neither Variable Set

**Input:**
```javascript
{
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@project.iam.gserviceaccount.com'
  // No GOOGLE_PRIVATE_KEY or GOOGLE_PRIVATE_KEY_BASE64
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'MISSING_PRIVATE_KEY', message: 'Private key is missing...' }
  ]
}
```

---

### 4.3 Variable Set to "undefined" String

**Input:**
```javascript
{
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'undefined',
  GOOGLE_PRIVATE_KEY: 'undefined'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'INVALID_EMAIL_FORMAT', receivedEmail: 'undefined' },
    { code: 'MISSING_BEGIN_MARKER', keyPreview: 'undefined' }
  ]
}
```

**Behavior:** Treats "undefined" as literal string, not JavaScript undefined

---

### 4.4 Variable Set to "null" String

**Input:**
```javascript
{
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'null',
  GOOGLE_PRIVATE_KEY: 'null'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'INVALID_EMAIL_FORMAT', receivedEmail: 'null' }
  ]
}
```

---

### 4.5 Whitespace-Only Key

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: '   \n   \t   '
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'NULL_PRIVATE_KEY', message: 'Private key is null or undefined' }
  ]
}
```

**Behavior:** Whitespace is trimmed, resulting in empty string

---

### 4.6 Unicode Characters

**Input:**
```javascript
{
  email: 'test@example.com😀',
  privateKey: VALID_PRIVATE_KEY + '😀'
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    { code: 'INVALID_EMAIL_FORMAT' }
  ]
}
```

---

### 4.7 Very Large Key (>10KB)

**Input:**
```javascript
{
  email: 'test@project.iam.gserviceaccount.com',
  privateKey: VALID_PRIVATE_KEY + 'A'.repeat(100000)
}
```

**Expected Output:**
```javascript
{
  valid: true,  // Structure is valid
  warnings: [
    {
      code: 'KEY_TOO_LONG',
      message: 'Private key unusually long (101675 chars)',
      suggestion: 'Verify there are no extra characters appended',
      actualLength: 101675,
      expectedMaxLength: 4096
    }
  ]
}
```

---

## Category 5: Environment Issues 🌍

### 5.1 Missing Email

**Input:**
```javascript
{
  GOOGLE_PRIVATE_KEY: VALID_PRIVATE_KEY
  // No GOOGLE_SERVICE_ACCOUNT_EMAIL
}
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'MISSING_EMAIL',
      message: 'GOOGLE_SERVICE_ACCOUNT_EMAIL is missing',
      suggestion: 'Set the GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable'
    }
  ]
}
```

---

### 5.2 Network Failure During Auth

**Input:**
```javascript
validateCredentials(
  { email: VALID_EMAIL, privateKey: MOCK_KEY },
  { testAuthentication: true }  // Enable auth test
)
```

**Expected Output:**
```javascript
{
  valid: false,
  errors: [
    {
      code: 'AUTH_TEST_FAILED',
      message: 'Authentication test failed: ...',
      suggestion: 'Check Google Cloud Console for service account status',
      googleError: '...'
    }
  ],
  diagnostics: {
    validationSteps: [..., 'test_authentication']
  }
}
```

---

## Category 6: Diagnostics and Reporting 📊

### 6.1 Diagnostic Information

**All Results Include:**
```javascript
{
  diagnostics: {
    detectedFormat: 'environment_variables' | 'json_string' | 'credentials_object' | 'separate_fields' | 'base64_json',
    transformationsApplied: ['base64_decode', 'unescape_newlines', 'remove_quotes', ...],
    validationSteps: ['extract_credentials', 'parse_private_key', 'validate_email', 'validate_key_structure', 'test_authentication'],
    timeElapsed: 42  // milliseconds
  }
}
```

---

### 6.2 Report Generation

**Usage:**
```javascript
const validator = new GoogleCredentialsValidator(options);
const result = await validator.validate(input);
const report = validator.generateReport(result);
console.log(report);
```

**Sample Report:**
```
================================================================================
GOOGLE SERVICE ACCOUNT CREDENTIAL VALIDATION REPORT
================================================================================

Status: VALID ✓
Timestamp: 2025-01-19T10:30:45.123Z
Validation Time: 42ms

DIAGNOSTICS:
  Detected Format: environment_variables
  Transformations Applied: base64_decode, unescape_newlines
  Validation Steps: extract_credentials → parse_private_key → validate_email → validate_key_structure

WARNINGS:
  1. [BASE64_DECODED] Decoded base64-encoded private key
  2. [USING_BASE64] Using base64-encoded key (recommended)

CREDENTIALS:
  Email: service-account@project-123.iam.gserviceaccount.com
  Key Length: 1675 chars
  Key Preview: -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0...

================================================================================
```

---

## Quick Decision Tree

```
Input Received
├─ Has GOOGLE_SERVICE_ACCOUNT_EMAIL?
│  ├─ No → ERROR: MISSING_EMAIL
│  └─ Yes → Continue
│
├─ Has GOOGLE_PRIVATE_KEY_BASE64?
│  ├─ Yes → Use Base64, decode it
│  ├─ No → Check GOOGLE_PRIVATE_KEY
│  │  ├─ Yes → Use Plain Key
│  │  └─ No → ERROR: MISSING_PRIVATE_KEY
│  │
│  └─ Decode Base64
│     ├─ Success → Continue
│     └─ Fail → ERROR: BASE64_DECODE_FAILED
│
├─ Does key contain \\n?
│  ├─ Yes → Convert to \n
│  └─ No → Continue
│
├─ Is key quoted?
│  ├─ Yes → Remove quotes
│  └─ No → Continue
│
├─ Trim whitespace
│
├─ Validate Structure
│  ├─ Has BEGIN marker? (No → ERROR: MISSING_BEGIN_MARKER)
│  ├─ Has END marker? (No → ERROR: MISSING_END_MARKER)
│  ├─ Length >= 1600? (No → ERROR: KEY_TOO_SHORT)
│  ├─ Is PRIVATE KEY? (Not RSA, not CERT → ERROR: WRONG_KEY_TYPE)
│  └─ Valid base64 content? (No → ERROR: INVALID_KEY_CONTENT)
│
├─ Validate Email
│  ├─ Has @ and .? (No → ERROR: INVALID_EMAIL_FORMAT)
│  └─ Is gserviceaccount.com? (No → WARNING: NON_SERVICE_ACCOUNT_EMAIL)
│
└─ Test Authentication (if enabled)
   ├─ Can get token? (No → ERROR: AUTH_TEST_FAILED)
   └─ Yes → SUCCESS ✓
```

---

## Test File Locations

- **Comprehensive Test Suite**: `/Users/brandonin/OUTBOUND REPORTING/lib/google-credentials-validator.comprehensive.test.js`
- **Test Plan Documentation**: `/Users/brandonin/OUTBOUND REPORTING/COMPREHENSIVE_TEST_PLAN.md`
- **Execution Guide**: `/Users/brandonin/OUTBOUND REPORTING/TEST_EXECUTION_GUIDE.md`
- **Validator Implementation**: `/Users/brandonin/OUTBOUND REPORTING/lib/google-credentials-validator.js`

---

**Last Updated**: 2025-01-19
**Version**: 1.0.0
