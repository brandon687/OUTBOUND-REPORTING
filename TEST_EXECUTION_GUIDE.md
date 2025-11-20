# Test Execution Guide - Google Sheets Credential Parser

## Quick Start

### Run All Tests
```bash
node lib/google-credentials-validator.comprehensive.test.js
```

### Expected Output (Success)
```
================================================================================
COMPREHENSIVE GOOGLE CREDENTIALS VALIDATOR TEST SUITE
================================================================================

Category 1: Valid Inputs
--------------------------------------------------------------------------------
✓ [1.1] Properly base64-encoded key
✓ [1.2] Plain key with literal \n
✓ [1.3] Plain key with actual newlines
✓ [1.4] Key with surrounding quotes
✓ [1.5] Key with extra whitespace

Category 2: Invalid Inputs
--------------------------------------------------------------------------------
✓ [2.1] Empty GOOGLE_PRIVATE_KEY_BASE64
✓ [2.4] Truncated key - missing BEGIN
✓ [2.5] Truncated key - missing END
✓ [2.6] Key too short

Category 3: Malicious Inputs
--------------------------------------------------------------------------------
✓ [3.1] SQL injection in email
✓ [3.2] XSS in email
✓ [3.3] Path traversal

Category 4: Edge Cases
--------------------------------------------------------------------------------
✓ [4.1] Both base64 and plain key set (base64 wins)
✓ [4.2] Neither variable set
✓ [4.3] Variable set to "undefined" string
✓ [4.5] Whitespace-only key

Category 5: Environment Issues
--------------------------------------------------------------------------------
✓ [5.1] Missing email
✓ [5.3] Network failure during auth (simulated)

Category 6: Diagnostics and Reporting
--------------------------------------------------------------------------------
✓ [6.1] Diagnostic information included
✓ [6.2] Report generation

================================================================================
TEST SUMMARY
================================================================================
Total:  20
Passed: 20 ✓
Failed: 0 ✗
Success Rate: 100.0%
================================================================================
```

## Test Coverage Summary

| Category | Tests | What It Validates |
|----------|-------|-------------------|
| **1. Valid Inputs** | 5 | Proper handling of various valid formats (base64, escaped, quoted, whitespace) |
| **2. Invalid Inputs** | 4 | Rejection of malformed, truncated, or incomplete credentials |
| **3. Malicious Inputs** | 3 | Security: SQL injection, XSS, path traversal handled safely |
| **4. Edge Cases** | 4 | Unusual scenarios: conflicting vars, undefined strings, whitespace |
| **5. Environment Issues** | 2 | Missing variables and auth failures |
| **6. Diagnostics** | 2 | Reporting and diagnostic information completeness |

**Total Coverage:** 20 core scenarios from 46 detailed test cases in the full suite

## Key Test Scenarios

### Valid Input Tests ✅

1. **Base64 Encoding** - Validates proper decoding of base64-encoded keys
   ```javascript
   GOOGLE_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...
   ```

2. **Escaped Newlines** - Handles `\\n` strings correctly
   ```javascript
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIB..."
   ```

3. **Quoted Keys** - Removes surrounding quotes
   ```javascript
   GOOGLE_PRIVATE_KEY="\"-----BEGIN PRIVATE KEY-----\n...\""
   ```

4. **Whitespace** - Trims leading/trailing whitespace
   ```javascript
   GOOGLE_PRIVATE_KEY="  -----BEGIN PRIVATE KEY-----\n...  "
   ```

### Invalid Input Tests ❌

1. **Empty Key** - Detects missing credentials
   ```javascript
   GOOGLE_PRIVATE_KEY_BASE64=""
   // Error: MISSING_PRIVATE_KEY
   ```

2. **Truncated Key** - Validates BEGIN/END markers
   ```javascript
   // Missing -----BEGIN PRIVATE KEY-----
   // Error: MISSING_BEGIN_MARKER
   ```

3. **Short Key** - Validates minimum length
   ```javascript
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"
   // Error: KEY_TOO_SHORT (must be 1600+ chars)
   ```

### Security Tests 🛡️

1. **SQL Injection** - Safely rejects malicious strings
   ```javascript
   email: "'; DROP TABLE users; --"
   // Error: INVALID_EMAIL_FORMAT (no SQL execution)
   ```

2. **XSS Attempts** - Handles script tags safely
   ```javascript
   email: "<script>alert('xss')</script>@example.com"
   // No script execution, treated as string
   ```

3. **Path Traversal** - Prevents file system access
   ```javascript
   privateKey: "../../../etc/passwd"
   // Error: MISSING_BEGIN_MARKER (no file access)
   ```

### Edge Case Tests 🔍

1. **Conflicting Variables** - Base64 takes precedence
   ```javascript
   GOOGLE_PRIVATE_KEY="wrong"
   GOOGLE_PRIVATE_KEY_BASE64="correct_base64"
   // Uses base64 version
   ```

2. **Undefined String** - Treats as literal string
   ```javascript
   GOOGLE_PRIVATE_KEY="undefined"
   // Error: MISSING_BEGIN_MARKER
   ```

3. **Whitespace Only** - Detects empty after trim
   ```javascript
   GOOGLE_PRIVATE_KEY="   \n   "
   // Error: NULL_PRIVATE_KEY
   ```

## Interpreting Test Results

### Success Indicators ✅
- All tests show ✓
- Success Rate: 100.0%
- Exit code: 0

### Failure Indicators ❌
- Tests show ✗
- Error message printed below test name
- Success Rate < 100%
- Exit code: 1

### Common Failure Reasons

1. **Validator Logic Changed**
   - Update tests to match new behavior
   - Document changes in COMPREHENSIVE_TEST_PLAN.md

2. **Test Fixture Issues**
   - Verify VALID_PRIVATE_KEY is 1600+ chars
   - Check email formats

3. **Environment Differences**
   - Node.js version compatibility
   - Buffer encoding differences

## Adding New Tests

### Manual Test Runner Format
```javascript
await runTest('X.Y', 'Test name', async () => {
  const result = await validateCredentials({
    email: 'test@example.com',
    privateKey: 'test-key'
  }, { testAuthentication: false, logger: mockLogger });

  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});
```

### Jest Format (for full suite)
```javascript
test('should do something', async () => {
  const result = await validateCredentials(input, options);
  expect(result.valid).toBe(true);
});
```

## Debugging Failed Tests

### 1. Run with Verbose Logging
```javascript
const customLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error
};

const result = await validateCredentials(input, {
  testAuthentication: false,
  logger: customLogger
});

console.log('Full result:', JSON.stringify(result, null, 2));
```

### 2. Check Diagnostics
```javascript
console.log('Format detected:', result.diagnostics.detectedFormat);
console.log('Transformations:', result.diagnostics.transformationsApplied);
console.log('Validation steps:', result.diagnostics.validationSteps);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

### 3. Generate Report
```javascript
const validator = new GoogleCredentialsValidator(options);
const result = await validator.validate(input);
console.log(validator.generateReport(result));
```

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Credential Validator Tests
  run: node lib/google-credentials-validator.comprehensive.test.js
```

### Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed

## Test Maintenance Checklist

- [ ] Run tests after any validator code changes
- [ ] Update tests when adding new input formats
- [ ] Add tests for new error codes
- [ ] Update COMPREHENSIVE_TEST_PLAN.md with changes
- [ ] Verify tests pass on all supported Node.js versions
- [ ] Check test coverage remains >95%

## Known Limitations

1. **Authentication Tests**: Cannot test real Google API auth without valid credentials
   - Solution: Mock keys will fail auth test (expected behavior)
   - Set `testAuthentication: false` for unit tests

2. **Email Validation**: Current regex is permissive
   - Allows characters like `<>` in email local part
   - Service account check provides additional validation

3. **Double/Triple Encoding**: Not automatically detected
   - Intentional to prevent over-processing
   - User must re-encode correctly

## Related Files

- **Test Implementation**: `/Users/brandonin/OUTBOUND REPORTING/lib/google-credentials-validator.comprehensive.test.js`
- **Test Plan Documentation**: `/Users/brandonin/OUTBOUND REPORTING/COMPREHENSIVE_TEST_PLAN.md`
- **Validator Implementation**: `/Users/brandonin/OUTBOUND REPORTING/lib/google-credentials-validator.js`
- **Original Test Suite**: `/Users/brandonin/OUTBOUND REPORTING/lib/google-credentials-validator.test.js`

## Support

For questions or issues with the test suite:
1. Review COMPREHENSIVE_TEST_PLAN.md for detailed scenarios
2. Check test output diagnostics
3. Run with verbose logging
4. Generate validation report for failed cases
