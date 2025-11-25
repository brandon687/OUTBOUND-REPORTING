# Google Sheets API Setup Guide

## Overview
This guide will help you set up Google Sheets API access for your Analytics Dashboard. The dashboard requires **TWO** Google Sheets to function:

1. **Outbound IMEIs Sheet** - Individual IMEI/device records
2. **Raw Customer Data Sheet** - Aggregated customer order data

## Required Google Sheets

### Sheet 1: Outbound IMEIs
- **Sheet URL**: https://docs.google.com/spreadsheets/d/1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw/edit
- **Sheet ID**: `1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw`
- **Tab Name**: `outbound IMEIs`
- **Headers (Row 1)**: imei, model, capacity, grade, total, customer, date, invoice, tracking, invtype

### Sheet 2: Raw Customer Data
- **Tab Name**: `RAW CUSTOMER DATA` (can be in same Google Sheets document or separate)
- **Headers (Row 1)**: COMPANY_NAME, MODEL, GB, INVTYPE, UNITS, INVNO, QBO_TRANSACTION_DATE, AVG_PRICE

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
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_BASE64=your_base64_encoded_private_key

# Outbound IMEIs Sheet (for dashboard)
GOOGLE_SHEET_ID=1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw
GOOGLE_SHEET_NAME=outbound IMEIs

# Customer Data Sheet (for dashboard analytics)
GOOGLE_CUSTOMER_SHEET_ID=1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw
GOOGLE_CUSTOMER_SHEET_NAME=RAW CUSTOMER DATA
```

**To get the base64 encoded private key:**
1. Use the provided encoding script:
   ```bash
   node encode-google-key.js path/to/your-service-account.json
   ```
2. Copy the `GOOGLE_PRIVATE_KEY_BASE64` value from the output
3. Paste it into your `.env` file

**Note:** If both sheets are tabs in the same Google Sheets document, `GOOGLE_CUSTOMER_SHEET_ID` can be the same as `GOOGLE_SHEET_ID`.

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

Start your server locally:
```bash
node server.js
```

Test the connections:
```bash
# Test IMEI data endpoint
curl http://localhost:3000/api/sheets/dashboard-data

# Test customer data endpoint
curl http://localhost:3000/api/sheets/customer-data

# Test historical data (for calendar view)
curl http://localhost:3000/api/historical/test

# Diagnose connection issues
curl http://localhost:3000/api/historical/diagnose
```

Open the dashboard in your browser:
```
http://localhost:3000/dashboard
```

Check the browser console for success messages:
- ✓ "Loaded X IMEI rows from Google Sheets"
- ✓ "Loaded X customer rows from Google Sheets"

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

### Outbound IMEIs Sheet Columns (Row 1):
- `imei`: Device IMEI number
- `model`: iPhone model (e.g., "14 PRO")
- `capacity`: Storage capacity (e.g., "256GB")
- `grade`: Device grade (A, B, C, etc.)
- `total`: Sale price/total
- `customer`: Customer name
- `date`: Transaction date (format: YYYY-MM-DD)
- `invoice`: Invoice number (e.g., "21142")
- `tracking`: Tracking number
- `invtype`: Invoice type (e.g., "mixed", "new", "refurb")

### Raw Customer Data Sheet Columns (Row 1):
- `COMPANY_NAME`: Full customer/company name
- `MODEL`: iPhone model (e.g., "11 PRO")
- `GB`: Storage capacity (e.g., "64GB")
- `INVTYPE`: Invoice type (e.g., "UNKNOWN", "mixed")
- `UNITS`: Number of units in order
- `INVNO`: Invoice number (e.g., "12891")
- `QBO_TRANSACTION_DATE`: QuickBooks transaction date (format: YYYY-MM-DD)
- `AVG_PRICE`: Average price per unit

## Dashboard Features Using This Data

The dashboard uses both sheets to provide:
- **Top 25 Customers by Revenue** with trend analysis (Growing/Stable/Declining)
- **Customer Analytics** including order frequency and revenue patterns
- **Product Performance** by model and capacity
- **Invoice Type Distribution**
- **Re-engagement Targets** for inactive customers

The trend analysis compares the last 4 weeks vs previous 4 weeks of customer revenue to categorize accounts as Growing (>10% increase), Stable (±10%), or Declining (>10% decrease).
