# 🚀 Deploy to Railway NOW - Quick Guide

## ✅ All Code is Ready!

Your repository: **https://github.com/brandon687/OUTBOUND-REPORTING**

All features working:
- ✅ Live Notion API integration (2,818+ orders)
- ✅ Customer names auto-matched
- ✅ Tracking numbers displayed
- ✅ Quantities parsed correctly
- ✅ Order details and status
- ✅ Tested with invoices 20976 & 20997

---

## 🚂 Deploy to Railway (5 minutes)

### Step 1: Login to Railway
1. Go to **https://railway.app**
2. Click **"Login"**
3. Select **"Login with GitHub"**
4. Authorize Railway

### Step 2: Create New Project
1. Click **"New Project"** (top right)
2. Select **"Deploy from GitHub repo"**
3. Choose **"brandon687/OUTBOUND-REPORTING"**
4. Railway will auto-detect Node.js and start building

### Step 3: Add Environment Variables
1. Click on your project
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**

Add these TWO variables:

**Variable 1:**
```
Name: NOTION_API_KEY
Value: [Your Notion Integration Token - starts with ntn_]
```
*(Get this from: https://www.notion.so/my-integrations)*

**Variable 2:**
```
Name: NOTION_DATABASE_ID
Value: [Your Notion Database ID - 32 character string]
```
*(Get this from your Notion database URL)*

**Note:** Your actual values are in your `.env` file locally. Copy them from there.

### Step 4: Wait for Deployment
1. Go to **"Deployments"** tab
2. Watch the build logs (1-2 minutes)
3. Wait for status: **"Success"** ✅

### Step 5: Generate Domain
1. Go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Copy your URL (e.g., `outbound-reporting-production.up.railway.app`)

### Step 6: Test Your Dashboard
1. Visit your Railway URL
2. You should see the dashboard
3. Upload your CSV file
4. Verify customer names appear for invoices

---

## 🧪 Testing Checklist

Once deployed, verify:
- [ ] Dashboard loads
- [ ] Can upload CSV file
- [ ] Summary cards show totals
- [ ] Invoice table displays
- [ ] **Customer names appear** (e.g., Invoice 20997 = AMERICA TECH)
- [ ] **Tracking numbers appear**
- [ ] Click to expand invoice details
- [ ] Print functionality works

---

## 🔍 Troubleshooting

### Issue: "Notion database not found"
- Check `NOTION_DATABASE_ID` is correct
- Verify database is shared with integration

### Issue: No customer names
- Check `NOTION_API_KEY` is correct
- Verify 2818+ orders loaded (check Railway logs)

### Issue: Build fails
- Check Railway logs in "Deployments" tab
- Verify `package.json` and `server.js` exist

---

## 📊 What You Get in Production

**Live Dashboard Features:**
- 💰 Total revenue & units sold
- 👥 Customer names from Notion (auto-matched)
- 📦 Tracking numbers from Notion
- 📋 Expandable invoice details
- 🎨 Visual analytics (color, lock status, grades)
- 🖨️ Professional print layout
- 📱 Mobile responsive design

**Notion Integration:**
- 🔄 Fetches 2,818+ orders on startup
- ⚡ Fast API responses
- 🔐 READ-ONLY access (safe)
- 📊 Auto-matches by invoice number

---

## 🎉 You're Almost There!

1. Go to **https://railway.app** now
2. Follow steps above
3. Get your production URL
4. Share it with your team!

**Estimated time: 5 minutes** ⏱️

---

## 🆘 Need Help?

If you encounter any issues during deployment:
1. Check Railway deployment logs
2. Test Notion API: `https://your-url.railway.app/api/orders`
3. Verify environment variables are set correctly

Your code is 100% ready to deploy! 🚀
