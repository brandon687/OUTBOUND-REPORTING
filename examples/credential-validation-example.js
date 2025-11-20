#!/usr/bin/env node

/**
 * Example script demonstrating various uses of the Google Credentials Validator
 *
 * Run with: node examples/credential-validation-example.js
 */

const {
  GoogleCredentialsValidator,
  validateCredentials,
  validateFromEnv,
  validateFromJSON
} = require('../lib/google-credentials-validator');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log(colors.bright + colors.cyan, title);
  console.log('='.repeat(80) + '\n');
}

// Example 1: Basic validation
async function example1_basicValidation() {
  section('Example 1: Basic Validation');

  const mockCredentials = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@project.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n'
  };

  log(colors.blue, '📋 Input:');
  console.log(JSON.stringify(mockCredentials, null, 2));

  log(colors.blue, '\n🔍 Validating...');
  const result = await validateCredentials(mockCredentials, {
    testAuthentication: false // Skip auth test for demo
  });

  if (result.valid) {
    log(colors.green, '✓ Validation successful!');
    console.log('\nCredentials:');
    console.log(`  Email: ${result.credentials.client_email}`);
    console.log(`  Key length: ${result.credentials.private_key.length} chars`);
  } else {
    log(colors.red, '✗ Validation failed!');
    console.log('\nErrors:');
    result.errors.forEach(error => {
      console.log(`  [${error.code}] ${error.message}`);
      if (error.suggestion) {
        log(colors.yellow, `  💡 ${error.suggestion}`);
      }
    });
  }

  if (result.warnings.length > 0) {
    log(colors.yellow, '\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  [${warning.code}] ${warning.message}`);
    });
  }

  log(colors.cyan, '\n📊 Diagnostics:');
  console.log(`  Format detected: ${result.diagnostics.detectedFormat}`);
  console.log(`  Transformations: ${result.diagnostics.transformationsApplied.join(', ') || 'none'}`);
  console.log(`  Time: ${result.diagnostics.timeElapsed}ms`);
}

// Example 2: Handling different formats
async function example2_differentFormats() {
  section('Example 2: Handling Different Input Formats');

  const validKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jL...\n-----END PRIVATE KEY-----\n';
  const email = 'service@project.iam.gserviceaccount.com';

  const formats = [
    {
      name: 'Environment Variables Format',
      input: {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: email,
        GOOGLE_PRIVATE_KEY: validKey
      }
    },
    {
      name: 'Credentials Object Format',
      input: {
        client_email: email,
        private_key: validKey
      }
    },
    {
      name: 'Separate Fields Format',
      input: {
        email: email,
        privateKey: validKey
      }
    },
    {
      name: 'JSON String Format',
      input: JSON.stringify({
        client_email: email,
        private_key: validKey,
        type: 'service_account'
      })
    },
    {
      name: 'Base64-Encoded Key Format',
      input: {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: email,
        GOOGLE_PRIVATE_KEY_BASE64: Buffer.from(validKey).toString('base64')
      }
    }
  ];

  for (const format of formats) {
    log(colors.blue, `\n📝 Testing: ${format.name}`);

    const result = await validateCredentials(format.input, {
      testAuthentication: false,
      logger: { info: () => {}, warn: () => {}, error: () => {} } // Suppress logs
    });

    if (result.valid) {
      log(colors.green, `  ✓ Valid - Detected as: ${result.diagnostics.detectedFormat}`);
    } else {
      log(colors.red, `  ✗ Invalid - ${result.errors[0]?.code}`);
    }
  }
}

// Example 3: Key transformation scenarios
async function example3_keyTransformations() {
  section('Example 3: Key Transformation Scenarios');

  const originalKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jL...\n-----END PRIVATE KEY-----\n';
  const email = 'service@project.iam.gserviceaccount.com';

  const scenarios = [
    {
      name: 'Normal key',
      key: originalKey
    },
    {
      name: 'Escaped newlines (\\n)',
      key: originalKey.replace(/\n/g, '\\n')
    },
    {
      name: 'Quoted key',
      key: `"${originalKey}"`
    },
    {
      name: 'Base64-encoded',
      key: Buffer.from(originalKey).toString('base64')
    },
    {
      name: 'Windows CRLF',
      key: originalKey.replace(/\n/g, '\r\n')
    },
    {
      name: 'Extra whitespace',
      key: `  ${originalKey}  `
    }
  ];

  for (const scenario of scenarios) {
    log(colors.blue, `\n🔧 Testing: ${scenario.name}`);

    const result = await validateCredentials(
      {
        email: email,
        privateKey: scenario.key
      },
      {
        testAuthentication: false,
        logger: { info: () => {}, warn: () => {}, error: () => {} }
      }
    );

    if (result.valid) {
      const transformations = result.diagnostics.transformationsApplied;
      log(colors.green, `  ✓ Parsed successfully`);
      if (transformations.length > 0) {
        console.log(`  🔄 Transformations: ${transformations.join(', ')}`);
      }
    } else {
      log(colors.red, `  ✗ Failed: ${result.errors[0]?.message}`);
    }
  }
}

// Example 4: Error scenarios
async function example4_errorScenarios() {
  section('Example 4: Error Detection and Reporting');

  const validEmail = 'service@project.iam.gserviceaccount.com';
  const validKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jL...\n-----END PRIVATE KEY-----\n';

  const errorScenarios = [
    {
      name: 'Missing email',
      input: { privateKey: validKey }
    },
    {
      name: 'Invalid email format',
      input: { email: 'not-an-email', privateKey: validKey }
    },
    {
      name: 'Missing private key',
      input: { email: validEmail }
    },
    {
      name: 'Missing BEGIN marker',
      input: { email: validEmail, privateKey: validKey.replace('-----BEGIN PRIVATE KEY-----', '') }
    },
    {
      name: 'Missing END marker',
      input: { email: validEmail, privateKey: validKey.replace('-----END PRIVATE KEY-----', '') }
    },
    {
      name: 'Key too short',
      input: { email: validEmail, privateKey: '-----BEGIN PRIVATE KEY-----\nshort\n-----END PRIVATE KEY-----' }
    },
    {
      name: 'Wrong key type (RSA)',
      input: { email: validEmail, privateKey: validKey.replace('PRIVATE KEY', 'RSA PRIVATE KEY') }
    },
    {
      name: 'Certificate instead of key',
      input: { email: validEmail, privateKey: validKey.replace('PRIVATE KEY', 'CERTIFICATE') }
    },
    {
      name: 'Unknown format',
      input: { unknownField: 'value' }
    }
  ];

  for (const scenario of errorScenarios) {
    log(colors.blue, `\n❌ Testing: ${scenario.name}`);

    const result = await validateCredentials(scenario.input, {
      testAuthentication: false,
      logger: { info: () => {}, warn: () => {}, error: () => {} }
    });

    if (!result.valid && result.errors.length > 0) {
      const error = result.errors[0];
      log(colors.red, `  Error Code: ${error.code}`);
      console.log(`  Message: ${error.message}`);
      if (error.suggestion) {
        log(colors.yellow, `  💡 Suggestion: ${error.suggestion}`);
      }
    } else {
      log(colors.yellow, `  ⚠️  Expected error but validation passed`);
    }
  }
}

// Example 5: Detailed report generation
async function example5_reportGeneration() {
  section('Example 5: Detailed Report Generation');

  // Test with invalid credentials
  const input = {
    email: 'invalid-email',
    privateKey: '-----BEGIN PRIVATE KEY-----\nshort\n-----END PRIVATE KEY-----'
  };

  log(colors.blue, '📋 Validating invalid credentials to generate error report...\n');

  const validator = new GoogleCredentialsValidator({
    testAuthentication: false,
    logger: { info: () => {}, warn: () => {}, error: () => {} }
  });

  const result = await validator.validate(input);
  const report = validator.generateReport(result);

  console.log(report);
}

// Example 6: Environment variable validation
async function example6_envValidation() {
  section('Example 6: Environment Variable Validation');

  log(colors.blue, '📋 Checking current environment variables...\n');

  // Create mock environment (in real usage, this would be process.env)
  const mockEnv = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@project.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jL...\n-----END PRIVATE KEY-----\n'
  };

  // Check what's configured
  if (mockEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    log(colors.green, '✓ GOOGLE_SERVICE_ACCOUNT_EMAIL is set');
    console.log(`  Value: ${mockEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
  } else {
    log(colors.red, '✗ GOOGLE_SERVICE_ACCOUNT_EMAIL is not set');
  }

  if (mockEnv.GOOGLE_PRIVATE_KEY_BASE64) {
    log(colors.green, '✓ GOOGLE_PRIVATE_KEY_BASE64 is set (recommended)');
    console.log(`  Length: ${mockEnv.GOOGLE_PRIVATE_KEY_BASE64.length} chars`);
  } else if (mockEnv.GOOGLE_PRIVATE_KEY) {
    log(colors.yellow, '⚠️  GOOGLE_PRIVATE_KEY is set (consider using BASE64 version)');
    console.log(`  Length: ${mockEnv.GOOGLE_PRIVATE_KEY.length} chars`);
  } else {
    log(colors.red, '✗ No private key environment variable set');
  }

  log(colors.blue, '\n🔍 Validating...');
  const result = await validateFromEnv(mockEnv, {
    testAuthentication: false
  });

  if (result.valid) {
    log(colors.green, '✓ Environment variables are valid!');
  } else {
    log(colors.red, '✗ Environment variables are invalid');
    result.errors.forEach(error => {
      console.log(`\n  [${error.code}] ${error.message}`);
      if (error.suggestion) {
        log(colors.yellow, `  💡 ${error.suggestion}`);
      }
    });
  }
}

// Example 7: Custom validation with additional checks
async function example7_customValidation() {
  section('Example 7: Custom Validation with Additional Checks');

  class ProjectSpecificValidator extends GoogleCredentialsValidator {
    async validate(input) {
      // Run standard validation first
      const result = await super.validate(input);

      if (result.valid) {
        log(colors.blue, '\n🔍 Running project-specific validation...');

        // Add custom checks
        const email = result.credentials.client_email;

        // Check 1: Must be from specific project
        if (!email.includes('my-project-id')) {
          result.valid = false;
          result.errors.push({
            message: 'Service account must be from my-project-id',
            code: 'WRONG_PROJECT',
            suggestion: 'Use a service account from the correct GCP project'
          });
        }

        // Check 2: Must follow naming convention
        if (!email.startsWith('outbound-')) {
          result.warnings.push({
            message: 'Service account name should start with "outbound-"',
            code: 'NAMING_CONVENTION',
            suggestion: 'Create a new service account following naming convention'
          });
        }

        // Check 3: Key age check (in real implementation, would check key creation date)
        log(colors.green, '  ✓ Project validation passed');
      }

      return result;
    }
  }

  const validator = new ProjectSpecificValidator({
    testAuthentication: false,
    logger: { info: () => {}, warn: () => {}, error: () => {} }
  });

  const input = {
    email: 'outbound-reporting@my-project-id.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8jL...\n-----END PRIVATE KEY-----\n'
  };

  log(colors.blue, '📋 Testing custom validator...');
  const result = await validator.validate(input);

  if (result.valid) {
    log(colors.green, '✓ Custom validation passed!');
  } else {
    log(colors.red, '✗ Custom validation failed');
    result.errors.forEach(error => {
      console.log(`  [${error.code}] ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    log(colors.yellow, '\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  [${warning.code}] ${warning.message}`);
    });
  }
}

// Main runner
async function main() {
  log(colors.bright + colors.cyan, '\n╔═══════════════════════════════════════════════════════════════════════════╗');
  log(colors.bright + colors.cyan, '║         Google Service Account Credentials Validator Examples            ║');
  log(colors.bright + colors.cyan, '╚═══════════════════════════════════════════════════════════════════════════╝');

  const examples = [
    { fn: example1_basicValidation, name: 'Basic Validation' },
    { fn: example2_differentFormats, name: 'Different Formats' },
    { fn: example3_keyTransformations, name: 'Key Transformations' },
    { fn: example4_errorScenarios, name: 'Error Scenarios' },
    { fn: example5_reportGeneration, name: 'Report Generation' },
    { fn: example6_envValidation, name: 'Environment Validation' },
    { fn: example7_customValidation, name: 'Custom Validation' }
  ];

  // Run specific example if provided as argument
  const arg = process.argv[2];
  if (arg) {
    const exampleNum = parseInt(arg);
    if (exampleNum >= 1 && exampleNum <= examples.length) {
      await examples[exampleNum - 1].fn();
      return;
    } else {
      log(colors.red, `Invalid example number. Choose 1-${examples.length}`);
      console.log('\nUsage: node examples/credential-validation-example.js [example_number]');
      console.log('\nAvailable examples:');
      examples.forEach((ex, i) => {
        console.log(`  ${i + 1}. ${ex.name}`);
      });
      return;
    }
  }

  // Run all examples
  for (let i = 0; i < examples.length; i++) {
    try {
      await examples[i].fn();

      if (i < examples.length - 1) {
        console.log('\n' + '-'.repeat(80));
        log(colors.cyan, 'Press Enter to continue to next example...');
        // In real usage with terminal: await new Promise(resolve => process.stdin.once('data', resolve));
        await new Promise(resolve => setTimeout(resolve, 100)); // Auto-continue for demo
      }
    } catch (error) {
      log(colors.red, `\n❌ Example failed: ${error.message}`);
      console.error(error);
    }
  }

  log(colors.bright + colors.green, '\n✅ All examples completed!');
  console.log('\nTip: Run a specific example with: node examples/credential-validation-example.js [1-7]');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log(colors.red, '\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  example1_basicValidation,
  example2_differentFormats,
  example3_keyTransformations,
  example4_errorScenarios,
  example5_reportGeneration,
  example6_envValidation,
  example7_customValidation
};
