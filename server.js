const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
const axios = require('axios');
const XLSX = require('xlsx');
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

// Cache for Notion orders
let cachedOrders = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to fetch and cache Notion orders
async function fetchAndCacheNotionOrders(forceRefresh = false) {
  const now = Date.now();

  // Return cached data if still valid and not forcing refresh
  if (!forceRefresh && cachedOrders && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
    console.log(`✓ Serving cached orders (${cachedOrders.length} orders, age: ${Math.floor((now - lastFetchTime) / 1000)}s)`);
    return cachedOrders;
  }

  console.log('Fetching orders from Notion...');
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error('Notion database ID not configured');
  }

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

    console.log(`  Fetched ${allResults.length} orders so far...`);
  }

  // Transform Notion data to our format
  const orders = allResults.map(page => {
    const props = page.properties;

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

    // Get ASN file (check if it's a file attachment)
    let asnFile = null;
    if (props['ASN']?.files && props['ASN'].files.length > 0) {
      asnFile = {
        name: props['ASN'].files[0].name,
        url: props['ASN'].files[0].file?.url || props['ASN'].files[0].external?.url
      };
    } else if (props['ASN']?.rich_text?.[0]?.plain_text) {
      // Fallback to text if not a file
      asnFile = props['ASN'].rich_text[0].plain_text;
    }

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
      asn: asnFile,
    };
  });

  console.log(`✓ Successfully fetched and cached ${orders.length} orders`);

  // Update cache
  cachedOrders = orders;
  lastFetchTime = now;

  return orders;
}

// API endpoint to fetch order data from Notion (uses cache)
app.get('/api/orders', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const orders = await fetchAndCacheNotionOrders(forceRefresh);

    res.json({
      orders,
      cached: !forceRefresh && cachedOrders !== null,
      cacheAge: lastFetchTime ? Math.floor((Date.now() - lastFetchTime) / 1000) : 0
    });
  } catch (error) {
    console.error('Error fetching from Notion:', error);
    res.status(500).json({
      error: 'Failed to fetch orders from Notion',
      details: error.message
    });
  }
});

// API endpoint to force refresh cache
app.post('/api/orders/refresh', async (req, res) => {
  try {
    console.log('Manual cache refresh requested');
    const orders = await fetchAndCacheNotionOrders(true);
    res.json({
      success: true,
      orders,
      message: `Refreshed ${orders.length} orders`
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({
      error: 'Failed to refresh cache',
      details: error.message
    });
  }
});

// API endpoint to download and parse ASN file
app.get('/api/asn/:invoice', async (req, res) => {
  try {
    const invoiceNum = req.params.invoice;
    console.log(`Fetching ASN for invoice ${invoiceNum}...`);

    // Find the order in cache
    if (!cachedOrders) {
      return res.status(503).json({ error: 'Orders not loaded yet' });
    }

    const order = cachedOrders.find(o => o.invoice === invoiceNum);
    if (!order) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!order.asn || typeof order.asn === 'string') {
      return res.status(404).json({ error: 'No ASN file attached', asnText: order.asn });
    }

    // Download the Excel file
    console.log(`Downloading ASN file: ${order.asn.name}`);
    const response = await axios.get(order.asn.url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    // Parse Excel file
    const workbook = XLSX.read(response.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Extract IMEI list (assuming first column contains IMEIs)
    const imeis = [];
    for (let i = 1; i < jsonData.length; i++) { // Skip header row
      const row = jsonData[i];
      if (row[0]) { // If first column has data
        imeis.push(String(row[0]).trim());
      }
    }

    console.log(`✓ Parsed ASN file: ${imeis.length} IMEIs found`);

    res.json({
      invoice: invoiceNum,
      fileName: order.asn.name,
      totalIMEIs: imeis.length,
      imeis: imeis,
      rawData: jsonData.slice(0, 10) // Send first 10 rows for debugging
    });

  } catch (error) {
    console.error('Error fetching ASN:', error);
    res.status(500).json({
      error: 'Failed to fetch ASN file',
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

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/orders`);
  console.log(`🔄 Cache duration: ${CACHE_DURATION / 1000} seconds`);

  // Pre-warm cache on startup
  console.log('🔥 Pre-warming cache...');
  try {
    await fetchAndCacheNotionOrders();
    console.log('✓ Cache pre-warmed successfully');
  } catch (error) {
    console.error('❌ Failed to pre-warm cache:', error.message);
  }
});
