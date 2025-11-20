# Google Sheets Authentication Troubleshooting Guide

## Current Error

```
🔑 Using base64-encoded private key...
❌ Failed to initialize Google Sheets client: Private key missing BEGIN marker
```

## What This Means

Your `GOOGLE_PRIVATE_KEY_BASE64` environment variable in Railway **is set**, but when the server decodes it from base64, the resulting text **does not contain** the required `-----BEGIN PRIVATE KEY-----` marker.

## Root Cause Analysis

The base64 value in Railway is likely:

1. **NOT actually base64-encoded** - You may have pasted the plain text key into the _BASE64 variable
2. **Wrong value encoded** - You encoded something other than the `private_key` field from your JSON
3. **Incomplete key** - You only encoded part of the key (missing BEGIN/END markers)
4. **Corrupted during copy/paste** - Extra whitespace, line breaks, or encoding issues

## How to Fix (Step-by-Step)

### Step 1: Get Your Service Account JSON Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **IAM & Admin** → **Service Accounts**
3. Find your service account: `sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com`
4. Click the **three dots** → **Manage keys**
5. Click **Add Key** → **Create new key** → **JSON**
6. Download the JSON file (e.g., `prime-poetry-476719-t3-xxxxx.json`)

### Step 2: Encode the Private Key Correctly

**Option A: Use the Helper Script (Recommended)**

```bash
# In your project directory
node encode-google-key.js path/to/prime-poetry-476719-t3-xxxxx.json
```

This will output:
```
✅ Base64-encoded private key (copy this to GOOGLE_PRIVATE_KEY_BASE64):

LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUVWZ0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktVd2dnU2hBZ0VBQW9JQkFRQ3JvUGtFTTZWWUZlWkkKcnhob29scWlTbmdJOStueGdVRllrY0tNZFZnUi9UYnlGYmlGajMva1RoK3dxTjBpa3FDSWU5cHhRNXhLN1hEdworQkdyTElCZTFKdXcwT1JXeG9GYlcrU1JpQ1Jvd3Vqem1aYzVMd2lLa0Z3ZDJrT0FPeGRXNGdCd3k5TldOQldCCllWeXNuVEhnZjB2NGRXB3RORjhXeExRaVhmekSAwMDAwMD...
```

**Option B: Manual Encoding**

```bash
# Extract just the private_key value from your JSON (including the quotes and \n)
# Then encode it:
echo -n '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqh...\n-----END PRIVATE KEY-----\n' | base64
```

**IMPORTANT**: The echo command above should contain the ENTIRE private key on one line with literal `\n` characters (not actual newlines).

### Step 3: Set in Railway

1. Go to your Railway project
2. Navigate to **Variables** tab
3. **Delete** the existing `GOOGLE_PRIVATE_KEY_BASE64` variable (if present)
4. **Delete** the existing `GOOGLE_PRIVATE_KEY` variable (if present) - use only one method!
5. **Add new variable**: `GOOGLE_PRIVATE_KEY_BASE64`
6. **Paste the ENTIRE base64 string** from Step 2 (should be 2000+ characters, all on one line)
7. **Save** and **Redeploy**

### Step 4: Verify the Fix

After redeploying, check the Railway logs for:

```
✓ Successfully decoded base64 key with valid markers
✓ Private key validation passed
✓ Google Sheets API client initialized successfully
```

You can also visit these endpoints:

- `https://your-app.railway.app/api/historical/diagnose` - Detailed diagnostics
- `https://your-app.railway.app/api/historical/test` - Test the connection

## Common Mistakes & How to Avoid Them

### Mistake 1: Plain Key in _BASE64 Variable
**Symptom**: Error says "contains invalid base64 characters"

**Fix**: Either:
- Re-encode properly using `encode-google-key.js`
- OR rename variable to `GOOGLE_PRIVATE_KEY` (without _BASE64)

### Mistake 2: Wrong Field Encoded
**Symptom**: Decoded key is very short (<1000 chars) or looks like an email/URL

**What happened**: You encoded `client_email`, `project_id`, or another field instead of `private_key`

**Fix**:
- Open your JSON file
- Find the field called `"private_key"` (it's a very long string)
- That's the value you need to encode

### Mistake 3: Partial Key
**Symptom**: Decoded key missing BEGIN or END markers

**What happened**: You only copied part of the private key

**Fix**: The private key in your JSON should be ONE continuous string that looks like:
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...(very long)...=\n-----END PRIVATE KEY-----\n"
}
```
You need the ENTIRE value including both markers.

### Mistake 4: Double Encoding
**Symptom**: Diagnostic says "key appears to be DOUBLE-ENCODED"

**What happened**: You encoded an already-encoded value

**Fix**: Start fresh from the JSON file, not from a previous base64 value

### Mistake 5: Extra Whitespace
**Symptom**: Random decoding errors

**Fix**: The encode-google-key.js script handles this automatically. If encoding manually, use `echo -n` (the `-n` prevents adding a newline)

## Enhanced Diagnostic Logging

The improved server code now provides:

1. **Detailed decode attempts** - Shows exactly what was tried and why it failed
2. **Preview of decoded value** - Shows first/last 100 chars to identify what was actually encoded
3. **Multiple format detection** - Automatically tries:
   - Base64 decoding
   - Double-base64 decoding (if single fails)
   - Plain key detection (if base64 var contains plain text)
   - Literal `\n` conversion
4. **Helpful error messages** - Tells you exactly what's wrong and how to fix it

## What to Check in Railway Right Now

1. **Go to Railway** → Your project → **Variables** tab
2. **Find** `GOOGLE_PRIVATE_KEY_BASE64`
3. **Check the first 50 characters** of the value:

   - ✅ Should look like: `LS0tLS1CRUdJTiBQUklW...` (random letters/numbers)
   - ❌ Should NOT look like: `-----BEGIN PRIVATE KEY-----...` (this is plain text!)
   - ❌ Should NOT look like: `sales-dashboard@prime...` (this is the email!)

4. **Check the length**: Should be ~2000-2400 characters

## Alternative: Use Plain Key Format

If you continue having issues with base64, you can use the plain format instead:

1. **Delete** `GOOGLE_PRIVATE_KEY_BASE64` from Railway
2. **Add** `GOOGLE_PRIVATE_KEY` with this exact format:

```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCroPkEM6VYFeZI\nrxhoolqiSngI9+nxgUFYkcKMdVgR/TbyFbiFj3/kTh+wqN0ikqCIe9pxQ5xK7XDw\n+BGrLIBe1Juw0ORWxoFbW+SRiCRowujzmZc5LwiKkFwd2kOAOxdW4gBwy9NWNBWB\n...(entire key on one line with literal \n)...\n-----END PRIVATE KEY-----\n
```

**Note**: This is ONE line with literal backslash-n (`\n`) characters, not actual line breaks!

## Still Not Working?

If you're still seeing errors after following this guide:

1. **Visit** `/api/historical/diagnose` endpoint
2. **Copy the entire JSON response**
3. **Check the logs** in Railway for the detailed diagnostic output
4. **Look for**:
   - `initializationAttempts` - What methods were tried
   - `keyFormat.preview` - What the decoded value actually contains
   - `issues` - Specific problems detected

The enhanced logging will tell you EXACTLY what's wrong with your current configuration.

## Quick Reference: Environment Variables Needed

```bash
# Required for Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com
GOOGLE_SHEET_ID=1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw
GOOGLE_SHEET_NAME=outbound IMEIs

# Choose ONE of these two methods:
GOOGLE_PRIVATE_KEY_BASE64=(base64-encoded key from encode-google-key.js)
# OR
GOOGLE_PRIVATE_KEY=(plain key with literal \n characters)
```

## Success Indicators

When everything is working correctly, you'll see in the logs:

```
🔑 Attempting to parse Google Sheets credentials...
📊 GOOGLE_PRIVATE_KEY_BASE64 found (2156 chars)
📊 Decoded to 1704 chars
📊 First 100 chars: -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCroPk...
✓ Successfully decoded base64 key with valid markers
✓ Private key validation passed
   Method: base64-decoded
   Email: sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com
   Key length: 1704 chars
✓ Google Sheets API client initialized successfully
```

## Contact for Help

If this guide doesn't solve your issue, provide:

1. The output from `/api/historical/diagnose`
2. The Railway deployment logs (redact the actual key values)
3. What you see as the first 50 characters of your Railway environment variable
