# 🔗 Notion API Setup - Quick Guide

## Your Notion Database Fields

Based on your screenshot, your database has:
- **Invoice #** - Invoice numbers (21043, 21042, etc.)
- **INVOICE - CUSTOMER** - Customer names
- **TRACKING** - Tracking numbers
- **QUANTITY HERE** - Order quantities
- **Order Type/Status** - Order status (Completed, Graded, mixed, etc.)

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Create Integration (2 min)

1. **Open:** https://www.notion.so/my-integrations
2. **Click:** "+ New integration"
3. **Name:** `Outbound Reporting`
4. **Workspace:** Select your workspace
5. **Submit**
6. **Copy the token** (starts with `secret_`)

```
Example token:
secret_1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T
```

### Step 2: Share Database (1 min)

1. **Open your Notion Orders database**
2. **Click** the "..." menu (top right corner)
3. **Scroll to** "Add connections"
4. **Select** "Outbound Reporting"
5. **Confirm**

### Step 3: Get Database ID (1 min)

1. **Copy your database URL** from the browser
2. **Extract the ID** (32 characters between last `/` and `?`)

```
URL Format:
https://www.notion.so/WORKSPACE_NAME/DATABASE_ID?v=VIEW_ID

Example:
https://www.notion.so/mycompany/a1b2c3d4e5f67890abcdef1234567890?v=12345
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                This is your Database ID
```

### Step 4: Test Connection (1 min)

Save these values - you'll need them for Railway:

```
NOTION_API_KEY=secret_YOUR_TOKEN_HERE
NOTION_DATABASE_ID=YOUR_DATABASE_ID_HERE
```

---

## 🧪 Test Locally (Optional)

If you want to test before deploying:

1. **Create `.env` file:**
```bash
cd "/Users/brandonin/OUTBOUND REPORTING"
cp .env.example .env
nano .env
```

2. **Add your credentials:**
```env
NOTION_API_KEY=secret_YOUR_ACTUAL_TOKEN
NOTION_DATABASE_ID=YOUR_ACTUAL_DATABASE_ID
PORT=3000
```

3. **Install and run:**
```bash
npm install
npm start
```

4. **Test at:** http://localhost:3000

5. **Check API:** http://localhost:3000/api/orders
   - Should return JSON with your orders

---

## ✅ Checklist

Before deploying to Railway, make sure:

- [ ] Created Notion integration
- [ ] Copied integration token (secret_...)
- [ ] Shared database with integration
- [ ] Extracted database ID from URL
- [ ] Tested locally (optional but recommended)
- [ ] Ready to paste into Railway environment variables

---

## 📝 Field Mapping

The server will automatically map your Notion fields:

| Notion Field | Dashboard Display |
|--------------|------------------|
| Invoice # | Invoice column |
| INVOICE - CUSTOMER | Customer column |
| TRACKING | Tracking column |
| QUANTITY HERE | Validation |
| Order Type/Status | Additional info |

---

## 🚨 Common Issues

### "Database not found"
- ❌ Database not shared with integration
- ✅ Go back to Step 2 and share it

### "Unauthorized"
- ❌ Wrong API key
- ✅ Copy token again from integrations page

### "No results"
- ❌ Wrong database ID
- ✅ Check URL and copy the correct 32-char ID

### Customer/Tracking shows "-"
- ❌ Field names don't match
- ✅ Ensure fields are named exactly: `INVOICE - CUSTOMER`, `TRACKING`

---

## 🎯 Next Step

Once you have both values, proceed to:
**DEPLOYMENT_GUIDE.md** → Section 2: Deploy to Railway
