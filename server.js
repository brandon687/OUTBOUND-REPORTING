const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
const axios = require('axios');
const XLSX = require('xlsx');
const { google } = require('googleapis');
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

// Initialize Google Sheets client
let sheetsClient = null;
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && (process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY_BASE64)) {
    // Parse private key - handle different possible formats
    let privateKey = '';

    // Try base64-encoded key first (most reliable for env vars)
    if (process.env.GOOGLE_PRIVATE_KEY_BASE64) {
      console.log('🔑 Using base64-encoded private key...');
      privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
    } else {
      privateKey = process.env.GOOGLE_PRIVATE_KEY;

      // If the key has literal \n strings (not actual newlines), replace them
      if (privateKey.includes('\\n')) {
        console.log('🔑 Converting literal \\n to newlines...');
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
    }

    // Remove any surrounding quotes that might have been added
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }

    // Ensure the key starts and ends correctly
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Private key missing BEGIN marker');
    }
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error('Private key missing END marker');
    }

    // Validate key length
    if (privateKey.length < 1000) {
      throw new Error(`Private key too short (${privateKey.length} chars, expected 1600+)`);
    }

    console.log('🔑 Attempting to initialize Google Sheets with service account...');
    console.log(`   Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    console.log(`   Key length: ${privateKey.length} chars`);
    console.log(`   Key preview: ${privateKey.substring(0, 35)}...`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('✓ Google Sheets API client initialized successfully');
  } else {
    console.warn('⚠️  Google Sheets credentials not configured');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('   Missing: GOOGLE_SERVICE_ACCOUNT_EMAIL');
    }
    if (!process.env.GOOGLE_PRIVATE_KEY && !process.env.GOOGLE_PRIVATE_KEY_BASE64) {
      console.warn('   Missing: GOOGLE_PRIVATE_KEY or GOOGLE_PRIVATE_KEY_BASE64');
    }
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Sheets client:', error.message);
  console.error('   Stack:', error.stack);
  console.warn('⚠️  Historical calendar view will not be available');
  console.warn('   💡 Try encoding your key as base64 and set GOOGLE_PRIVATE_KEY_BASE64 instead');
}

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

// API endpoint to diagnose Google Sheets credentials
app.get('/api/historical/diagnose', (req, res) => {
  const diagnosis = {
    configured: false,
    variables: {},
    keyFormat: null,
    issues: [],
  };

  // Check environment variables
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    diagnosis.variables.email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  } else {
    diagnosis.issues.push('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set');
  }

  if (process.env.GOOGLE_SHEET_ID) {
    diagnosis.variables.sheetId = process.env.GOOGLE_SHEET_ID;
  } else {
    diagnosis.issues.push('GOOGLE_SHEET_ID is not set');
  }

  if (process.env.GOOGLE_SHEET_NAME) {
    diagnosis.variables.sheetName = process.env.GOOGLE_SHEET_NAME;
  } else {
    diagnosis.issues.push('GOOGLE_SHEET_NAME is not set (will default to "outbound IMEIs")');
  }

  if (process.env.GOOGLE_PRIVATE_KEY_BASE64) {
    const keyBase64 = process.env.GOOGLE_PRIVATE_KEY_BASE64;
    let decodedKey = '';
    try {
      decodedKey = Buffer.from(keyBase64, 'base64').toString('utf8');
    } catch (e) {
      diagnosis.issues.push('GOOGLE_PRIVATE_KEY_BASE64 is not valid base64');
    }

    diagnosis.keyFormat = {
      type: 'base64',
      encodedLength: keyBase64.length,
      decodedLength: decodedKey.length,
      startsCorrectly: decodedKey.includes('-----BEGIN PRIVATE KEY-----'),
      endsCorrectly: decodedKey.includes('-----END PRIVATE KEY-----'),
      preview: decodedKey.substring(0, 50) + '...',
    };

    if (decodedKey && !decodedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      diagnosis.issues.push('Decoded private key missing BEGIN marker');
    }
    if (decodedKey && !decodedKey.includes('-----END PRIVATE KEY-----')) {
      diagnosis.issues.push('Decoded private key missing END marker');
    }
    if (decodedKey && decodedKey.length < 1000) {
      diagnosis.issues.push('Decoded private key seems too short (should be ~1600+ chars)');
    }
  } else if (process.env.GOOGLE_PRIVATE_KEY) {
    const key = process.env.GOOGLE_PRIVATE_KEY;
    diagnosis.keyFormat = {
      type: 'plain',
      length: key.length,
      hasBackslashN: key.includes('\\n'),
      hasActualNewlines: key.includes('\n'),
      startsCorrectly: key.includes('-----BEGIN PRIVATE KEY-----'),
      endsCorrectly: key.includes('-----END PRIVATE KEY-----'),
      preview: key.substring(0, 50) + '...',
    };

    if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
      diagnosis.issues.push('Private key missing BEGIN marker');
    }
    if (!key.includes('-----END PRIVATE KEY-----')) {
      diagnosis.issues.push('Private key missing END marker');
    }
    if (key.length < 1000) {
      diagnosis.issues.push('Private key seems too short (should be ~1600+ chars)');
    }
  } else {
    diagnosis.issues.push('GOOGLE_PRIVATE_KEY or GOOGLE_PRIVATE_KEY_BASE64 is not set');
    diagnosis.issues.push('💡 Tip: Use GOOGLE_PRIVATE_KEY_BASE64 for better compatibility');
  }

  diagnosis.configured = sheetsClient !== null;
  diagnosis.clientInitialized = sheetsClient !== null;

  res.json(diagnosis);
});

// API endpoint to test Google Sheets connection (MUST come before parameterized route)
app.get('/api/historical/test', async (req, res) => {
  try {
    if (!sheetsClient) {
      return res.status(503).json({
        error: 'Google Sheets not configured',
        hint: 'Check /api/historical/diagnose for details'
      });
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'outbound IMEIs';

    console.log(`Testing Google Sheets connection to ${sheetId}...`);

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:J10`, // Get first 10 rows
    });

    res.json({
      status: 'ok',
      sheetId,
      sheetName,
      totalRows: response.data.values?.length || 0,
      sampleData: response.data.values || [],
    });

  } catch (error) {
    console.error('Error testing Google Sheets:', error);
    res.status(500).json({
      error: 'Google Sheets test failed',
      details: error.message,
      code: error.code,
      hint: error.message.includes('JWT')
        ? 'Private key format issue - check /api/historical/diagnose'
        : error.message.includes('permission')
        ? 'Sheet not shared with service account'
        : 'Check logs for details',
    });
  }
});

// API endpoint to fetch historical data from Google Sheets aggregated by date
app.get('/api/historical/:year/:month', async (req, res) => {
  try {
    if (!sheetsClient) {
      return res.status(503).json({ error: 'Google Sheets not configured' });
    }

    const { year, month } = req.params;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'outbound IMEIs';

    console.log(`Fetching historical data for ${year}-${month}...`);

    // Fetch all data from sheet (we'll filter by date in memory)
    // Headers are in row 2, data starts from row 3
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:J`, // A-J columns: imei through invtype
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return res.json({ dailyTotals: {}, month, year });
    }

    // Headers from row 2
    const headers = rows[0]; // ['imei', 'model', 'capacity', 'color', 'lock_status', 'graded', 'price', 'updated_at', 'invno', 'invtype']
    const dataRows = rows.slice(1); // Skip header row

    // Aggregate by date for the requested month
    const dailyTotals = {};
    const invoicesByDate = {};

    dataRows.forEach(row => {
      const [imei, model, capacity, color, lock_status, graded, price, updated_at, invno, invtype] = row;

      if (!updated_at || !price) return; // Skip rows without date or price

      // Parse date (format: 2025-11-18 19:18:45)
      const datePart = updated_at.split(' ')[0]; // Get YYYY-MM-DD
      const [rowYear, rowMonth, rowDay] = datePart.split('-');

      // Filter to requested month/year
      if (rowYear !== year || rowMonth !== month) return;

      const dateKey = datePart; // Use YYYY-MM-DD as key
      const priceNum = parseFloat(price) || 0;

      // Aggregate daily revenue
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {
          date: dateKey,
          totalRevenue: 0,
          totalUnits: 0,
          invoices: new Set(),
        };
      }

      dailyTotals[dateKey].totalRevenue += priceNum;
      dailyTotals[dateKey].totalUnits += 1;
      dailyTotals[dateKey].invoices.add(invno);

      // Store invoice details by date
      if (!invoicesByDate[dateKey]) {
        invoicesByDate[dateKey] = {};
      }
      if (!invoicesByDate[dateKey][invno]) {
        invoicesByDate[dateKey][invno] = {
          invno,
          invtype,
          units: 0,
          total: 0,
          items: [],
        };
      }

      invoicesByDate[dateKey][invno].units += 1;
      invoicesByDate[dateKey][invno].total += priceNum;
      invoicesByDate[dateKey][invno].items.push({
        model,
        capacity,
        color,
        lock_status,
        graded,
        price: priceNum,
      });
    });

    // Convert Sets to counts
    Object.keys(dailyTotals).forEach(date => {
      dailyTotals[date].invoiceCount = dailyTotals[date].invoices.size;
      delete dailyTotals[date].invoices; // Remove Set object
    });

    console.log(`✓ Aggregated ${Object.keys(dailyTotals).length} days of data for ${year}-${month}`);

    res.json({
      month,
      year,
      dailyTotals,
      invoicesByDate,
    });

  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      error: 'Failed to fetch historical data',
      details: error.message,
    });
  }
});

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

// Serve the daily report HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/outbound_report.html');
});

// Serve the historical calendar HTML file
app.get('/calendar', (req, res) => {
  res.sendFile(__dirname + '/calendar.html');
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
