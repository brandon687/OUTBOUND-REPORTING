const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// API endpoint to fetch order data from Notion
app.get('/api/orders', async (req, res) => {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      return res.status(500).json({ error: 'Notion database ID not configured' });
    }

    console.log('Fetching orders from Notion...');

    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    // Transform Notion data to our format
    const orders = response.results.map(page => {
      const props = page.properties;

      return {
        invoice: props['Invoice #']?.number || props['Invoice #']?.title?.[0]?.plain_text || '',
        customer: props['INVOICE - CUSTOMER']?.rich_text?.[0]?.plain_text || '',
        tracking: props['TRACKING']?.rich_text?.[0]?.plain_text || '',
        quantity: props['QUANTITY HERE']?.number || 0,
        status: props['Order Type']?.select?.name || props['Status']?.select?.name || '',
      };
    });

    console.log(`Successfully fetched ${orders.length} orders`);
    res.json({ orders });

  } catch (error) {
    console.error('Error fetching from Notion:', error);
    res.status(500).json({
      error: 'Failed to fetch orders from Notion',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/outbound_report.html');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/orders`);
});
