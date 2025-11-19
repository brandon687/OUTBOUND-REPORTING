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

    // Fetch all pages (handle pagination)
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 100,
        start_cursor: startCursor,
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    const response = { results: allResults };

    // Transform Notion data to our format
    const orders = response.results.map(page => {
      const props = page.properties;

      // Log first page properties to debug field names
      if (response.results.indexOf(page) === 0) {
        console.log('Available fields:', Object.keys(props));
        console.log('Invoice # field:', JSON.stringify(props['Invoice #'], null, 2));
        console.log('INVOICE - CUSTOMER field:', JSON.stringify(props['INVOICE - CUSTOMER'], null, 2));
      }

      // Parse INVOICE - CUSTOMER field which contains "InvoiceNum - CustomerName"
      const invoiceCustomerText = props['INVOICE - CUSTOMER']?.title?.[0]?.text?.content || '';
      const customerParts = invoiceCustomerText.split(' - ');
      const invoiceNum = customerParts[0]?.trim() || '';
      const customerName = customerParts.slice(1).join(' - ').trim() || '';

      // Parse INVOICE - QTY field which contains "InvoiceNum - Quantity"
      const invoiceQtyText = props['INVOICE - QTY']?.rich_text?.[0]?.plain_text || '';
      const qtyParts = invoiceQtyText.split(' - ');
      const quantity = qtyParts[1] ? parseInt(qtyParts[1].trim()) : 0;

      // Get order details and ASN
      const orderDetails = props['ORDER DETAILS']?.rich_text?.[0]?.plain_text || '';
      const asn = props['ASN']?.rich_text?.[0]?.plain_text || '';

      return {
        invoice: invoiceNum ||
                 props['Invoice #']?.number ||
                 props['Invoice #']?.rich_text?.[0]?.plain_text || '',
        customer: customerName,
        tracking: props['TRACKING']?.rich_text?.[0]?.plain_text || '',
        quantity: quantity,
        status: props['Order type']?.select?.name ||
                props['STATUS']?.select?.name ||
                (props['Completed']?.checkbox ? 'Completed' : ''),
        orderDetails: orderDetails,
        asn: asn,
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
