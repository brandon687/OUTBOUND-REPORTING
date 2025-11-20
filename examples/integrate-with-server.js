/**
 * Example: Integrating the Google Credentials Validator with an Express server
 *
 * This shows how to replace the existing credential parsing logic in server.js
 * with the robust validator.
 */

const express = require('express');
const { google } = require('googleapis');
const {
  GoogleCredentialsValidator,
  validateFromEnv
} = require('../lib/google-credentials-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Global Google Sheets client
let sheetsClient = null;
let credentialValidationResult = null;

/**
 * Initialize Google Sheets with robust credential validation
 */
async function initializeGoogleSheets() {
  console.log('='.repeat(80));
  console.log('INITIALIZING GOOGLE SHEETS API');
  console.log('='.repeat(80));

  try {
    // Validate credentials with comprehensive checking
    console.log('\n🔍 Step 1: Validating credentials...');

    const result = await validateFromEnv(process.env, {
      strictMode: true,
      testAuthentication: true, // Test actual Google authentication
      minKeyLength: 1600,
      maxKeyLength: 4096,
      logger: console
    });

    // Store result for diagnostic endpoint
    credentialValidationResult = result;

    // Check if validation succeeded
    if (!result.valid) {
      console.error('\n❌ Credential validation failed!\n');

      // Display all errors
      result.errors.forEach((error, index) => {
        console.error(`Error ${index + 1}: [${error.code}] ${error.message}`);
        if (error.suggestion) {
          console.error(`  💡 Suggestion: ${error.suggestion}`);
        }
        if (error.details) {
          console.error(`  Details:`, error.details);
        }
      });

      // Generate and display detailed report
      const validator = new GoogleCredentialsValidator();
      const report = validator.generateReport(result);
      console.error('\n' + report);

      throw new Error('Invalid Google service account credentials');
    }

    console.log('✓ Credentials validated successfully!\n');

    // Display warnings if any
    if (result.warnings.length > 0) {
      console.warn('⚠️  Validation warnings:');
      result.warnings.forEach((warning, index) => {
        console.warn(`  ${index + 1}. [${warning.code}] ${warning.message}`);
      });
      console.warn('');
    }

    // Display diagnostic information
    console.log('📊 Diagnostics:');
    console.log(`  Format detected: ${result.diagnostics.detectedFormat}`);
    console.log(`  Transformations applied: ${result.diagnostics.transformationsApplied.join(', ') || 'none'}`);
    console.log(`  Validation time: ${result.diagnostics.timeElapsed}ms`);
    console.log('');

    // Step 2: Create Google Sheets client
    console.log('🔍 Step 2: Creating Google Sheets client...');

    const auth = new google.auth.GoogleAuth({
      credentials: result.credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('✓ Google Sheets client created successfully\n');

    // Step 3: Test connection with actual sheet
    if (process.env.GOOGLE_SHEET_ID) {
      console.log('🔍 Step 3: Testing connection to Google Sheet...');
      const sheetId = process.env.GOOGLE_SHEET_ID;
      const sheetName = process.env.GOOGLE_SHEET_NAME || 'outbound IMEIs';

      try {
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${sheetName}!A1:B5`
        });

        console.log(`✓ Successfully connected to sheet: ${sheetId}`);
        console.log(`  Sheet name: ${sheetName}`);
        console.log(`  Sample rows retrieved: ${response.data.values?.length || 0}`);
      } catch (error) {
        console.warn('⚠️  Failed to test sheet connection:', error.message);

        if (error.message.includes('permission')) {
          console.warn('  💡 Make sure the sheet is shared with:', result.credentials.client_email);
        } else if (error.message.includes('Unable to parse range')) {
          console.warn('  💡 Check that GOOGLE_SHEET_NAME matches the exact sheet tab name');
        }
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ GOOGLE SHEETS INITIALIZATION COMPLETE');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('='.repeat(80));
    console.error('❌ GOOGLE SHEETS INITIALIZATION FAILED');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  1. Check that all required environment variables are set:');
    console.error('     - GOOGLE_SERVICE_ACCOUNT_EMAIL');
    console.error('     - GOOGLE_PRIVATE_KEY or GOOGLE_PRIVATE_KEY_BASE64');
    console.error('     - GOOGLE_SHEET_ID');
    console.error('     - GOOGLE_SHEET_NAME (optional, defaults to "outbound IMEIs")');
    console.error('');
    console.error('  2. For private key issues, use base64 encoding:');
    console.error('     node encode-google-key.js path/to/service-account.json');
    console.error('');
    console.error('  3. Check the diagnostic endpoint after server starts:');
    console.error('     http://localhost:3000/api/credentials/diagnose');
    console.error('');

    throw error;
  }
}

/**
 * API endpoint: Detailed credential diagnostics
 */
app.get('/api/credentials/diagnose', async (req, res) => {
  try {
    // Run fresh validation
    const result = await validateFromEnv(process.env, {
      strictMode: false, // Allow more lenient checking for diagnostics
      testAuthentication: req.query.test_auth === 'true', // Optional auth test
      logger: console
    });

    const validator = new GoogleCredentialsValidator();
    const report = validator.generateReport(result);

    res.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      diagnostics: result.diagnostics,
      credentials: result.valid ? {
        email: result.credentials.client_email,
        keyLength: result.credentials.private_key.length,
        keyPreview: result.credentials.private_key.substring(0, 50) + '...'
      } : null,
      report: report,
      environment: {
        hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasPlainKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasBase64Key: !!process.env.GOOGLE_PRIVATE_KEY_BASE64,
        hasSheetId: !!process.env.GOOGLE_SHEET_ID,
        hasSheetName: !!process.env.GOOGLE_SHEET_NAME,
        sheetId: process.env.GOOGLE_SHEET_ID || null,
        sheetName: process.env.GOOGLE_SHEET_NAME || 'outbound IMEIs (default)'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to run diagnostics',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * API endpoint: Validate credentials (without testing auth)
 */
app.get('/api/credentials/validate', async (req, res) => {
  try {
    const result = await validateFromEnv(process.env, {
      testAuthentication: false,
      logger: console
    });

    res.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      diagnostics: result.diagnostics
    });
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

/**
 * API endpoint: Test Google Sheets connection
 */
app.get('/api/sheets/test', async (req, res) => {
  try {
    if (!sheetsClient) {
      return res.status(503).json({
        error: 'Google Sheets not initialized',
        hint: 'Check /api/credentials/diagnose for details'
      });
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'outbound IMEIs';

    if (!sheetId) {
      return res.status(400).json({
        error: 'GOOGLE_SHEET_ID not configured'
      });
    }

    console.log(`Testing Google Sheets connection to ${sheetId}...`);

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:J10`
    });

    res.json({
      status: 'ok',
      sheetId: sheetId,
      sheetName: sheetName,
      sampleRows: response.data.values?.length || 0,
      sampleData: response.data.values || []
    });

  } catch (error) {
    console.error('Google Sheets test failed:', error);

    let suggestion = 'Check logs for details';
    if (error.message.includes('JWT')) {
      suggestion = 'Private key format issue - check /api/credentials/diagnose';
    } else if (error.message.includes('permission') || error.message.includes('caller does not have permission')) {
      suggestion = `Sheet not shared with service account: ${credentialValidationResult?.credentials?.client_email}`;
    } else if (error.message.includes('Unable to parse range')) {
      suggestion = 'Sheet name does not match - check GOOGLE_SHEET_NAME';
    } else if (error.message.includes('not found')) {
      suggestion = 'Sheet ID is invalid or sheet does not exist';
    }

    res.status(500).json({
      error: 'Google Sheets test failed',
      message: error.message,
      code: error.code,
      suggestion: suggestion
    });
  }
});

/**
 * API endpoint: Get validation status
 */
app.get('/api/status', (req, res) => {
  res.json({
    googleSheets: {
      initialized: sheetsClient !== null,
      credentialsValid: credentialValidationResult?.valid || false,
      lastValidation: credentialValidationResult ? {
        valid: credentialValidationResult.valid,
        errorCount: credentialValidationResult.errors.length,
        warningCount: credentialValidationResult.warnings.length,
        detectedFormat: credentialValidationResult.diagnostics.detectedFormat
      } : null
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      port: PORT
    }
  });
});

/**
 * API endpoint: Health check
 */
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      googleSheets: sheetsClient ? 'initialized' : 'not_initialized'
    }
  };

  res.json(health);
});

/**
 * Start server with initialization
 */
async function startServer() {
  console.log('🚀 Starting server...\n');

  try {
    // Initialize Google Sheets
    await initializeGoogleSheets();

    // Start Express server
    app.listen(PORT, () => {
      console.log('🚀 Server is running!');
      console.log('');
      console.log('📍 Endpoints:');
      console.log(`  Health:              http://localhost:${PORT}/api/health`);
      console.log(`  Status:              http://localhost:${PORT}/api/status`);
      console.log(`  Validate:            http://localhost:${PORT}/api/credentials/validate`);
      console.log(`  Diagnose:            http://localhost:${PORT}/api/credentials/diagnose`);
      console.log(`  Test Connection:     http://localhost:${PORT}/api/sheets/test`);
      console.log('');
      console.log('💡 Tips:');
      console.log('  - Use /api/credentials/diagnose?test_auth=true to test authentication');
      console.log('  - Check /api/status for initialization status');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('');
    console.error('The server will NOT start because Google Sheets initialization failed.');
    console.error('Fix the credential issues and try again.');
    console.error('');
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  initializeGoogleSheets,
  startServer
};
