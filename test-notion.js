require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function testNotion() {
    console.log('Testing Notion connection...');
    console.log('API Key:', process.env.NOTION_API_KEY ? '✓ Present' : '✗ Missing');
    console.log('Database ID:', databaseId);
    console.log('');

    try {
        console.log('Fetching all pages from Notion database...');
        let allResults = [];
        let hasMore = true;
        let startCursor = undefined;
        let pageCount = 0;

        while (hasMore) {
            const response = await notion.databases.query({
                database_id: databaseId,
                page_size: 100,
                start_cursor: startCursor,
            });

            allResults = allResults.concat(response.results);
            hasMore = response.has_more;
            startCursor = response.next_cursor;
            pageCount++;
            console.log(`  Page ${pageCount}: fetched ${response.results.length} records (has_more: ${hasMore})`);
        }

        console.log('');
        console.log(`✓ Total records fetched: ${allResults.length}`);
        console.log('');

        // Extract and parse invoice numbers
        const invoices = [];
        allResults.forEach(page => {
            const props = page.properties;

            // Parse INVOICE - CUSTOMER field
            const invoiceCustomerText = props['INVOICE - CUSTOMER']?.title?.[0]?.text?.content || '';
            const customerParts = invoiceCustomerText.split(' - ');
            const invoiceNum = customerParts[0]?.trim() || '';
            const customerName = customerParts.slice(1).join(' - ').trim() || '';

            // Parse TRACKING field
            const trackingText = props['TRACKING']?.rich_text?.[0]?.text?.content || '';

            // Parse ASN field
            const asnFiles = props['ASN']?.files || [];
            const asnUrl = asnFiles.length > 0 ? asnFiles[0].file?.url || asnFiles[0].external?.url : null;

            if (invoiceNum) {
                invoices.push({
                    invoice: invoiceNum,
                    customer: customerName,
                    tracking: trackingText,
                    hasASN: !!asnUrl
                });
            }
        });

        // Sort by invoice number
        invoices.sort((a, b) => parseInt(b.invoice) - parseInt(a.invoice));

        console.log('Latest 10 invoices in Notion:');
        console.log('─'.repeat(80));
        invoices.slice(0, 10).forEach(inv => {
            console.log(`Invoice: ${inv.invoice} | Customer: ${inv.customer || '(none)'} | ASN: ${inv.hasASN ? '✓' : '✗'}`);
        });
        console.log('');

        console.log('Oldest 10 invoices in Notion:');
        console.log('─'.repeat(80));
        invoices.slice(-10).forEach(inv => {
            console.log(`Invoice: ${inv.invoice} | Customer: ${inv.customer || '(none)'} | ASN: ${inv.hasASN ? '✓' : '✗'}`);
        });
        console.log('');

        // Check for specific invoices from the CSV
        const csvInvoices = ['20959', '20997', '21023', '21005', '21016'];
        console.log('Checking for CSV invoices in Notion:');
        console.log('─'.repeat(80));
        csvInvoices.forEach(num => {
            const found = invoices.find(inv => inv.invoice === num);
            if (found) {
                console.log(`✓ Invoice ${num}: FOUND - ${found.customer} (ASN: ${found.hasASN ? '✓' : '✗'})`);
            } else {
                console.log(`✗ Invoice ${num}: NOT FOUND IN NOTION`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
        if (error.status) console.error('   Status:', error.status);
    }
}

testNotion();
