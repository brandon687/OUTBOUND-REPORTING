# QUICK FIX: Google Sheets Authentication Error

## The Problem

Your Railway logs show:
```
❌ Failed to initialize Google Sheets client: Private key missing BEGIN marker
```

**Root Cause**: The `GOOGLE_PRIVATE_KEY_BASE64` variable in Railway contains a **plain text key** instead of a **base64-encoded key**.

## How to Know If This Is Your Issue

Check the first 20 characters of your `GOOGLE_PRIVATE_KEY_BASE64` in Railway:

| What You See | What It Means | Status |
|--------------|---------------|--------|
| `LS0tLS1CRUdJTi...` | Base64-encoded (correct) | ✅ Good |
| `-----BEGIN PRIVATE...` | Plain text key (wrong) | ❌ **This is your problem!** |
| `MIIEvQIBADANBgkq...` | Encoded key content without header | ❌ Wrong field encoded |
| `c2FsZXMtZGFzaGJv...` | Email or other field encoded | ❌ Wrong field encoded |

## 5-Minute Fix

### Option 1: Quick Fix (Use Plain Key Variable)

1. **In Railway, rename the variable:**
   - Change `GOOGLE_PRIVATE_KEY_BASE64` → `GOOGLE_PRIVATE_KEY`
   - Keep the same value (the plain text key)

2. **Redeploy**

3. **Verify** - Look for this in logs:
   ```
   📊 GOOGLE_PRIVATE_KEY found
   ✓ Private key validation passed
   ✓ Google Sheets API client initialized successfully
   ```

### Option 2: Proper Fix (Use Base64 Encoding)

1. **Get your service account JSON file** from Google Cloud Console:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Select project: `prime-poetry-476719-t3`
   - Find: `sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com`
   - Click "Keys" → "Add Key" → "Create new key" → JSON
   - Download the JSON file

2. **Encode the key**:
   ```bash
   # In your project directory:
   node encode-google-key.js /path/to/downloaded-key.json
   ```

   This will output something like:
   ```
   ✅ Base64-encoded private key (copy this to GOOGLE_PRIVATE_KEY_BASE64):

   LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUVWZ0lCQURBTk...

   (very long string)
   ```

3. **Update Railway**:
   - Delete `GOOGLE_PRIVATE_KEY` if it exists
   - Set `GOOGLE_PRIVATE_KEY_BASE64` to the long base64 string from step 2
   - Make sure you copy the **ENTIRE** string (should be ~2100 characters)

4. **Redeploy**

5. **Verify** - Look for this in logs:
   ```
   📊 GOOGLE_PRIVATE_KEY_BASE64 found (2156 chars)
   📊 Decoded to 1704 chars
   ✓ Successfully decoded base64 key with valid markers
   ✓ Google Sheets API client initialized successfully
   ```

## Diagnostic Endpoint

After deploying the latest code, visit:
```
https://your-app.railway.app/api/historical/diagnose
```

This will show:
- Which variables are set
- What format was detected
- What the decoded value looks like
- Specific issues and how to fix them

## Common Mistakes

### Mistake 1: Plain Key in BASE64 Variable
**What happened**: You copied the plain text key directly into `GOOGLE_PRIVATE_KEY_BASE64`

**How to identify**:
- Variable value starts with `-----BEGIN`
- Log shows: "GOOGLE_PRIVATE_KEY_BASE64 appears to contain a plain key"

**Fix**: Use Option 1 above (rename variable)

### Mistake 2: Wrong Field Encoded
**What happened**: You encoded `client_email` or another field instead of `private_key`

**How to identify**:
- Log shows: "Decoded to 45 chars" (should be ~1700)
- Log preview shows: "sales-dashboard@prime-poetry..." (an email, not a key)

**Fix**: Encode the correct field using Option 2 above

### Mistake 3: Incomplete Key
**What happened**: Only part of the key was copied/encoded

**How to identify**:
- Decoded length is less than 1000 characters
- Log shows: "Private key too short"

**Fix**: Copy the COMPLETE private key including both `-----BEGIN` and `-----END` markers

### Mistake 4: Double-Encoded
**What happened**: The key was base64-encoded twice

**How to identify**:
- Log shows: "Key was double-encoded! Successfully decoded twice"
- This is auto-fixed by the new code

**Fix**: No action needed, the code handles this automatically

## What The Enhanced Code Does

The latest `server.js` now:

1. ✅ Detects plain text keys in `_BASE64` variables (auto-recovers)
2. ✅ Tries double-decoding if needed (auto-recovers)
3. ✅ Shows detailed diagnostics of what was decoded
4. ✅ Provides specific error messages with previews
5. ✅ Supports multiple input formats
6. ✅ Handles literal `\n` conversion
7. ✅ Strips quotes and whitespace

## Still Not Working?

1. **Check Railway logs** for the specific error message
2. **Visit** `/api/historical/diagnose` to see detailed diagnostics
3. **Verify** the Google Sheet is shared with:
   ```
   sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com
   ```
4. **Check** all 4 variables are set correctly:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SHEET_NAME`
   - `GOOGLE_PRIVATE_KEY_BASE64` (or `GOOGLE_PRIVATE_KEY`)

## Success Indicators

When it's working, you'll see:
```
✓ Private key validation passed
   Method: base64-var-but-plain-key (or other method)
   Email: sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com
   Key length: 1704 chars
✓ Google Sheets API client initialized successfully
```

Then test:
- `/api/health` → Should return `200 OK`
- `/api/historical/test` → Should return sheet data
- `/calendar` → Should load with historical data
