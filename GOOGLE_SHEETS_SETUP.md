# Google Sheets API Setup Guide

## Overview
This guide will help you set up Google Sheets API access for the historical calendar view. The calendar will read data from your "outbound IMEIs" sheet with 500,000+ rows.

## Sheet Information
- **Sheet URL**: https://docs.google.com/spreadsheets/d/1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw/edit
- **Sheet ID**: `1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw`
- **Tab Name**: `outbound IMEIs`
- **Headers (Row 2)**: imei, model, capacity, color, lock_status, graded, price, updated_at, invno, invtype

## Step 1: Create Google Cloud Project & Enable API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" → "Enable APIs and Services"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 2: Create Service Account Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in details:
   - **Service account name**: `outbound-reporting` (or any name)
   - **Service account ID**: Will auto-generate
   - Click "Create and Continue"
4. Skip optional steps (roles) and click "Done"

## Step 3: Generate JSON Key File

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose **JSON** format
5. Click "Create" - a JSON file will download
6. **IMPORTANT**: Save this file securely - you'll need it for Railway deployment

## Step 4: Share Google Sheet with Service Account

1. Open the downloaded JSON file
2. Find the `client_email` field (looks like: `outbound-reporting@project-id.iam.gserviceaccount.com`)
3. Copy this email address
4. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw/edit
5. Click "Share" button (top right)
6. Paste the service account email
7. Set permission to **Viewer** (read-only)
8. Uncheck "Notify people"
9. Click "Share"

## Step 5: Add Credentials to Local .env File

Add these lines to your `.env` file:

```env
# Google Sheets API Configuration
GOOGLE_SHEET_ID=1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw
GOOGLE_SHEET_NAME=outbound IMEIs
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**To get the private key:**
1. Open the downloaded JSON file
2. Copy the entire value of `private_key` field (including the quotes and \n characters)
3. Paste it as shown above

## Step 6: Add Credentials to Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add these environment variables:
   - `GOOGLE_SHEET_ID` = `1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw`
   - `GOOGLE_SHEET_NAME` = `outbound IMEIs`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = (copy from JSON file)
   - `GOOGLE_PRIVATE_KEY` = (copy entire private_key value from JSON file)

**IMPORTANT**: When pasting the private key in Railway:
- Include the quotes
- Keep all the `\n` characters
- It should look like: `"-----BEGIN PRIVATE KEY-----\nMIIE...lots of characters...\n-----END PRIVATE KEY-----\n"`

## Step 7: Verify Setup

Once deployed, test the connection:
- Go to: `https://your-railway-app.railway.app/api/historical/test`
- You should see: `{ "status": "ok", "totalRows": [number], "sampleData": [...] }`

## Security Notes

✅ **DO**:
- Keep the JSON credentials file secure and never commit to Git
- Use environment variables for all sensitive data
- Grant only "Viewer" access to the service account

❌ **DON'T**:
- Commit the JSON file to Git
- Share the private key publicly
- Grant "Editor" access (we only need read access)

## Troubleshooting

**Error: "The caller does not have permission"**
- Make sure you shared the sheet with the service account email
- Check that the email in Railway matches the JSON file

**Error: "Unable to parse range"**
- Verify the sheet name is exactly: `outbound IMEIs`
- Check that headers are in row 2

**Error: "Invalid key format"**
- Ensure the private key includes `\n` characters
- Make sure it's wrapped in quotes in Railway

## Data Structure

Your sheet has these columns (row 2):
- `imei`: Device IMEI number
- `model`: iPhone model (e.g., "14 PRO")
- `capacity`: Storage capacity (e.g., "256GB")
- `color`: Device color
- `lock_status`: UNLOCKED/LOCKED
- `graded`: TRUE/FALSE
- `price`: Sale price
- `updated_at`: Date (format: YYYY-MM-DD HH:MM:SS)
- `invno`: Invoice number (e.g., "21025")
- `invtype`: Invoice type (e.g., "mixed")

The calendar view will aggregate by the `updated_at` date to show daily revenue totals.
