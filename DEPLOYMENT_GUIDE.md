# 🚀 Deployment Guide - Railway

## ✅ Code Successfully Pushed to GitHub!

Your repository: https://github.com/brandon687/OUTBOUND-REPORTING

---

## 📋 Step 1: Get Notion API Credentials

### 1.1 Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Name: `Outbound Reporting`
4. Select your workspace
5. Click **"Submit"**
6. Copy the **"Internal Integration Token"** (starts with `secret_`)
   - Save this somewhere safe!

### 1.2 Share Database with Integration

1. Open your Notion Orders database
2. Click the **"..."** menu (top right)
3. Scroll down to **"Add connections"**
4. Select **"Outbound Reporting"** integration
5. Click **"Confirm"**

### 1.3 Get Database ID

Your Notion database URL looks like:
```
https://www.notion.so/workspace-name/DATABASE_ID?v=...
```

Copy the **DATABASE_ID** part (32 character string with hyphens)

Example:
```
https://www.notion.so/myworkspace/abc123def456?v=xyz
                                  ^^^^^^^^^^^^
                                  This is your Database ID
```

---

## 🚂 Step 2: Deploy to Railway

### 2.1 Sign Up / Login

1. Go to https://railway.app
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your GitHub

### 2.2 Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **"brandon687/OUTBOUND-REPORTING"**
4. Railway will automatically detect Node.js and start building

### 2.3 Add Environment Variables

1. In Railway dashboard, click on your project
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these two variables:

**Variable 1:**
- Name: `NOTION_API_KEY`
- Value: `secret_...` (your integration token from Step 1.1)

**Variable 2:**
- Name: `NOTION_DATABASE_ID`
- Value: (your database ID from Step 1.3)

5. Click **"Add"** for each

### 2.4 Redeploy with Environment Variables

1. Go to **"Deployments"** tab
2. Click **"Deploy"** or wait for auto-deploy
3. Watch the build logs (should take 1-2 minutes)

### 2.5 Get Your Production URL

1. Go to **"Settings"** tab
2. Under **"Environment"**, find **"Domains"**
3. Click **"Generate Domain"**
4. Copy your URL (e.g., `outbound-reporting-production.up.railway.app`)

---

## ✅ Step 3: Test Your Production Dashboard

1. Visit your Railway URL
2. You should see the Outbound Reporting Dashboard
3. Drag and drop your CSV file
4. Verify that:
   - ✅ Financial summaries appear
   - ✅ Invoice table shows data
   - ✅ **Customer names** appear (from Notion)
   - ✅ **Tracking numbers** appear (from Notion)
   - ✅ Expandable invoice details work

---

## 🔍 Troubleshooting

### Issue: Customer/Tracking shows "-"

**Problem:** Notion data isn't loading

**Solution:**
1. Check Railway logs for errors
2. Verify `NOTION_API_KEY` is correct
3. Verify `NOTION_DATABASE_ID` is correct
4. Make sure database is shared with integration
5. Check that Notion field names match:
   - `Invoice #` (for invoice number)
   - `INVOICE - CUSTOMER` (for customer name)
   - `TRACKING` (for tracking info)
   - `QUANTITY HERE` (for quantity)

### Issue: Build fails on Railway

**Problem:** Missing dependencies or config issues

**Solution:**
1. Check Railway build logs
2. Verify `package.json` is in repository
3. Make sure `server.js` exists
4. Check that Node.js version is compatible

### Issue: Page doesn't load

**Problem:** Server not starting

**Solution:**
1. Check Railway logs in "Deployments" tab
2. Verify PORT environment variable (Railway sets this automatically)
3. Make sure `start` script in package.json is: `"start": "node server.js"`

---

## 📊 Your Production Dashboard Features

Once deployed, you can:

- 📤 **Upload CSV** - Drag & drop daily inventory exports
- 💰 **View Financials** - Total revenue, units, averages
- 👥 **See Customers** - Auto-matched from Notion
- 📦 **Track Orders** - Tracking numbers from Notion
- 📋 **Expand Invoices** - Detailed model/capacity breakdowns
- 🎨 **Analyze Data** - Color, lock status, grade distributions
- 🖨️ **Print Reports** - Professional formatting

---

## 🔐 Security Notes

- ✅ `.env` is gitignored (secrets not in GitHub)
- ✅ Notion API key stored securely in Railway
- ✅ CORS enabled for API security
- ⚠️ Consider making GitHub repo private (contains business logic)

---

## 📞 Need Help?

If you encounter issues:
1. Check Railway deployment logs
2. Verify Notion integration permissions
3. Test Notion API endpoint: `https://your-app.railway.app/api/orders`
4. Check browser console for JavaScript errors

---

## 🎉 You're Done!

Your dashboard is now live in production with:
- ✅ Live Notion integration
- ✅ Automatic customer matching
- ✅ Professional reporting
- ✅ Scalable cloud hosting

Bookmark your Railway URL and use it daily for inventory reports!
