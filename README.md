# 📊 Outbound Inventory Reporting Dashboard

A comprehensive visual reporting system for daily outbound inventory with live Notion integration for customer order data.

## Features

- 📦 **Drag & Drop CSV Upload** - Upload your daily inventory export
- 💰 **Financial Analytics** - Total revenue, units sold, average pricing
- 📋 **Invoice Breakdown** - Expandable invoice details with model/capacity
- 🎨 **Visual Reports** - Color distribution, lock status, grade analysis
- 🔗 **Live Notion Integration** - Auto-fetch customer & tracking data
- 🖨️ **Print Ready** - Professional report printing

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share your Orders database with the integration
5. Copy your database ID from the URL

### 3. Environment Variables

Create a `.env` file:

```env
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
PORT=3000
```

### 4. Run Locally

```bash
npm start
```

Visit: http://localhost:3000

## Deployment to Railway

1. Push to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy!

## Data Format

### Inventory CSV Headers
```
imei,model,capacity,color,lock_status,graded,price,updated_at,invno,invtype
```

### Notion Database Fields
- Invoice # (Number or Text)
- INVOICE - CUSTOMER (Text)
- TRACKING (Text)
- QUANTITY HERE (Number)
- Order Type/Status (Select)

## Support

For issues or questions, please open an issue on GitHub.
