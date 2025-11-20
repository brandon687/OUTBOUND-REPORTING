# Railway Environment Variables Checklist

## ✅ Required Variables

### Notion API (Already Working)
- [x] `NOTION_API_KEY` - Your Notion integration token
- [x] `NOTION_DATABASE_ID` - Your Notion database ID

### Google Sheets API (New - For Historical Calendar)

#### 1. GOOGLE_SHEET_ID
**Value should be:**
```
1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw
```

#### 2. GOOGLE_SHEET_NAME
**Value should be:**
```
outbound IMEIs
```
Note: Exact match including the space between "outbound" and "IMEIs"

#### 3. GOOGLE_SERVICE_ACCOUNT_EMAIL
**Value should be:**
```
sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com
```

#### 4. GOOGLE_PRIVATE_KEY_BASE64 (RECOMMENDED)
**🎯 Best Method**: Use base64-encoded key to avoid newline issues!

**How to generate the value:**
```bash
# Run this helper script:
node encode-google-key.js path/to/your-service-account-key.json

# Or manually encode from your JSON file:
# 1. Extract the private_key value from your JSON
# 2. Run: echo -n 'YOUR_PRIVATE_KEY_HERE' | base64
```

The script will output a long base64 string. Copy that ENTIRE string and set it as `GOOGLE_PRIVATE_KEY_BASE64` in Railway.

**Example output:**
```
LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUVWZ0lCQURBTkJna3Foa....(very long string)
```

---

#### Alternative: GOOGLE_PRIVATE_KEY (LEGACY)
**⚠️ Warning**: This method is error-prone due to newline handling!

**Correct format:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCroPkEM6VYFeZI\nrxhoolqiSngI9+nxgUFYkcKMdVgR/TbyFbiFj3/kTh+wqN0ikqCIe9pxQ5xK7XDw\n+BGrLIBe1Juw0ORWxoFbW+SRiCRowujzmZc5LwiKkFwd2kOAOxdW4gBwy9NWNBWB\nYVysnTHgf0v4dWotNF8WxLQiXfzUlY1h/tiDcnGu/gKFrKAeJ8HR3+9ieyvElNEu\n8pUZBu+5EIMWEOdSdoMCToRBXqYjhvp7NVuALhE9VzEUND4Nl0hpLc92sN11jh2A\nlg9c0B9Y3EuNTWoa475T/sWC8WI0KZyw/IUpiZRKrUJcwU8jYiZ0Y1SWZ0AGaQ1N\nxzrC7+GjAgMBAAECggEANTbT/tmEiqs/m4mup8KvF2K/lQhJIPhSqoOHLsWzaOB6\nCNVzQPYdUUxnxv6UkgOkgqzkLfoom5LDUfOYhtplcwG4xDoAkmc59HmphPYRU+ob\nEGyu1qwemdfot9jU1Q19TxMDz/VisXe0s0jc0yhqLpFJnN/K6/kxAn462+0IV2EF\nQa2ZFS9ANDt+mM6pffc/RZhCEpDO+YMiElil3f9TomO3YxrbYNh68uSJK9nevj7y\nuevAcmTwUYkRxSDN0bXoSeo5wC1PjiK7mb+xluKTPhOzu/BgtUNIEyPkS4wVNMiZ\n13QXN/7Ae787gYt7f7bgAEohzQUOwqsdOyNLzNdkAQKBgQDZrhELsKrBuKWz+tK6\nFTLG8peGd23tqQT4SS0rJu0G6vubTSaWOBygFb60oZ9GejTmObdGxFxwOSbINYu4\nmdOmNtyZf5T0tivIBRNsxD6WAzcMMIa75b/63jUmd3lJdzVh4t74UlGh9Cmcpkwj\nULbZnx/VGLmbMKcF4HLpSV+mMQKBgQDJ15JZ5AKuTkknLlzkqpxSZTw4AC5IDm7Y\nOUol7mhNKuo//RhLg1KuxkTf8lrbH+AtV0ghQTGLXcWIiip/+l6ExNSXZXupG3mY\nC+WqxxRut+0v2H3Arm/+CZe9FiXYOSbXoTC3bBtq8vCbn8sUTJeMpFrattbRfL0x\nRp7QQ4BMEwKBgA0RE9jdzAJA8UFyhv/AkgG7QjlCJgkkIjY9Pkbe2U+W/299HBnc\nWGuLopz5LrRuVYqUYFoRI3NhGuDdxftY0ImjtW5JaEmgPdSN6XKX/SHII5/JsezJ\nh9KpUAt1FITCcSPlGHlTh67vFyheGyfrim5ZzPFfwJR+QShrJrq2OtWhAoGAbfyK\nQ3F8BH+kXTVmaTSO+lcv+VQf5CP5Qtn1DbZcH7DC9Rt1obBt3c8suNvXppA4GHz3\nUSe1V7xBZ6Xigtprpu2a6uTh/cR6/d99xxG0kKCpHulZnSVw4X1YsjDfbnO2Nsof\nQdQnHKBFfIgWoXkbHAhzebsoU/8lGTTiVZpyzwECgYEAxtHWcGtojgf9q0UQgPGa\nB5eU/OtXglqR9lUe881Fo0dEq6iR5FvqWhGtwd2ZeSDsRhGIDSFamUA4phL+veKK\nTPqWAC140tx+383QpH/KTjrNbIuvQXUd7BywikoOj82bOXOvA6wP3mKPeuTSmQ/x\nblQlkJNVOrVApbRSviEflzk=\n-----END PRIVATE KEY-----\n
```

### ⚠️ Common Mistakes with GOOGLE_PRIVATE_KEY:

1. **Missing BEGIN line**: Must start with `-----BEGIN PRIVATE KEY-----\n` (not just `\n`)
2. **Missing END line**: Must end with `\n-----END PRIVATE KEY-----\n`
3. **No quotes in Railway**: Some interfaces need quotes, Railway doesn't
4. **Escaped vs literal \n**: Railway needs literal `\n` characters (two characters: backslash + n)
5. **Spaces**: No spaces anywhere in the key

**💡 If you're having issues with GOOGLE_PRIVATE_KEY, switch to GOOGLE_PRIVATE_KEY_BASE64 instead!**

## 🧪 Testing After Setting Variables

### 1. Check Railway Deployment Logs
Look for these success messages:
```
✓ Google Sheets API client initialized
✓ Successfully fetched and cached 2834 orders
✓ Cache pre-warmed successfully
🚀 Server running on http://localhost:3000
```

### 2. Test Health Endpoint
```
https://your-app.railway.app/api/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### 3. Test Google Sheets Connection
```
https://your-app.railway.app/api/historical/test
```
Should return:
```json
{
  "status": "ok",
  "sheetId": "1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw",
  "sheetName": "outbound IMEIs",
  "totalRows": 10,
  "sampleData": [...]
}
```

### 4. Test Historical Calendar
```
https://your-app.railway.app/calendar
```
Should display a calendar with revenue data.

## 🚨 If You See Errors

### Error: "Google Sheets not configured"
- Missing one or more of the 4 Google env variables
- Check spelling and variable names exactly

### Error: "Invalid credentials"
- GOOGLE_PRIVATE_KEY is malformed
- Check the format carefully against the example above

### Error: "The caller does not have permission"
- Sheet not shared with service account
- Share the sheet with: `sales-dashboard@prime-poetry-476719-t3.iam.gserviceaccount.com`

### Error: "Unable to parse range"
- GOOGLE_SHEET_NAME doesn't match exactly
- Sheet name must be: `outbound IMEIs` (with space)

## 📝 Setup Checklist

- [x] Code deployed to Railway
- [ ] GOOGLE_SHEET_ID set in Railway
- [ ] GOOGLE_SHEET_NAME set in Railway
- [ ] GOOGLE_SERVICE_ACCOUNT_EMAIL set in Railway
- [ ] GOOGLE_PRIVATE_KEY_BASE64 set in Railway (RECOMMENDED) OR
- [ ] GOOGLE_PRIVATE_KEY set in Railway (check format carefully!)
- [ ] Google Sheet shared with service account email
- [ ] Check deployment logs for "✓ Google Sheets API client initialized successfully"
- [ ] Test: /api/health returns 200 OK
- [ ] Test: /api/historical/diagnose shows no issues
- [ ] Test: /api/historical/test returns data
- [ ] Test: /calendar page loads successfully with data

## 🔧 Troubleshooting Tools

### New Diagnostic Endpoint
Visit `/api/historical/diagnose` to check your credential configuration:
- Shows which environment variables are set
- Validates private key format
- Identifies specific issues

### Helper Script
Run `node encode-google-key.js your-key.json` to generate base64-encoded credentials
