const snowflake = require('snowflake-sdk');
const crypto = require('crypto');

// Determine authentication method and build connection config
function buildConnectionConfig() {
  const baseConfig = {
    account: process.env.SNOWFLAKE_ACCOUNT || 'jyb98982',
    username: process.env.SNOWFLAKE_USERNAME,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    database: process.env.SNOWFLAKE_DATABASE || 'SCAL',
    schema: process.env.SNOWFLAKE_SCHEMA || 'OUTBOUND',
    clientSessionKeepAlive: true,
    clientSessionKeepAliveHeartbeatFrequency: 3600
  };

  // Check if we have a private key (for key pair authentication)
  if (process.env.SNOWFLAKE_PRIVATE_KEY_BASE64) {
    console.log('🔑 Using key pair authentication');
    const privateKeyBase64 = process.env.SNOWFLAKE_PRIVATE_KEY_BASE64;
    const privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

    // Snowflake SDK requires the private key to be in proper PKCS8 format
    // We need to use crypto.createPrivateKey() to ensure proper formatting
    try {
      const privateKeyObject = crypto.createPrivateKey({
        key: privateKeyPem,
        format: 'pem'
      });

      // Export in PKCS8 format as required by Snowflake
      const privateKeyFormatted = privateKeyObject.export({
        format: 'pem',
        type: 'pkcs8'
      });

      baseConfig.authenticator = 'SNOWFLAKE_JWT';
      baseConfig.privateKey = privateKeyFormatted;
      console.log('✅ Private key successfully formatted for Snowflake JWT authentication');
    } catch (error) {
      console.error('❌ Failed to parse private key:', error.message);
      throw new Error('Invalid private key format. Ensure the key is in valid PEM format.');
    }
  } else if (process.env.SNOWFLAKE_PASSWORD) {
    console.log('🔑 Using username/password authentication');
    baseConfig.password = process.env.SNOWFLAKE_PASSWORD;
  } else {
    throw new Error('No authentication method configured. Set either SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY_BASE64');
  }

  return baseConfig;
}

const connectionConfig = buildConnectionConfig();

/**
 * Create and return a Snowflake connection
 * @returns {Promise<Object>} Snowflake connection object
 */
function createConnection() {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(connectionConfig);

    connection.connect((err, conn) => {
      if (err) {
        console.error('Unable to connect to Snowflake:');
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Full error:', JSON.stringify(err, null, 2));
        reject(err);
      } else {
        console.log('Successfully connected to Snowflake');
        resolve(conn);
      }
    });
  });
}

/**
 * Execute a SQL query on Snowflake
 * @param {string} sqlText - SQL query to execute
 * @param {Array} binds - Optional array of bind parameters
 * @returns {Promise<Array>} Query results
 */
async function executeQuery(sqlText, binds = []) {
  let connection;

  try {
    connection = await createConnection();

    return new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sqlText,
        binds: binds,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Failed to execute statement:');
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            console.error('SQL State:', err.sqlState);
            console.error('Full error:', JSON.stringify(err, null, 2));
            reject(err);
          } else {
            console.log(`Successfully executed query. Rows returned: ${rows ? rows.length : 0}`);
            resolve(rows || []);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error executing query:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.destroy((err) => {
        if (err) {
          console.error('Unable to disconnect:', err.message);
        } else {
          console.log('Disconnected from Snowflake');
        }
      });
    }
  }
}

/**
 * Fetch IMEI data from SCAL.OUTBOUND.AUTOMATED table
 * @param {Object} filters - Optional filters (e.g., { model, color, grade })
 * @param {number} limit - Optional row limit
 * @returns {Promise<Array>} IMEI records
 */
async function fetchIMEIData(filters = {}, limit = null) {
  let query = 'SELECT * FROM SCAL.OUTBOUND.AUTOMATED';
  const conditions = [];
  const binds = [];

  // Add filters if provided
  if (filters.model) {
    conditions.push('MODEL = ?');
    binds.push(filters.model);
  }
  if (filters.color) {
    conditions.push('COLOR = ?');
    binds.push(filters.color);
  }
  if (filters.grade) {
    conditions.push('GRADE = ?');
    binds.push(filters.grade);
  }
  if (filters.lock_status) {
    conditions.push('LOCK_STATUS = ?');
    binds.push(filters.lock_status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Add limit if specified
  if (limit && limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  console.log('Executing IMEI query:', query);
  return await executeQuery(query, binds);
}

/**
 * Fetch customer data from SCAL_DAG.B2B_OUTBOUND.B2B_OUTBOUND_LOGS
 * Aggregates data by company, invoice, model, GB, and transaction date
 * @param {Object} filters - Optional filters (e.g., { company_name, invtype })
 * @returns {Promise<Array>} Customer transaction records
 */
async function fetchCustomerData(filters = {}) {
  let query = `
    SELECT
      COMPANY_NAME,
      MODEL,
      GB,
      UPPER(INVTYPE) as INVTYPE,
      COUNT(*) as UNITS,
      INVNO,
      QBO_TRANSACTION_DATE,
      AVG(PRICE) as AVG_PRICE
    FROM SCAL_DAG.B2B_OUTBOUND.B2B_OUTBOUND_LOGS
  `;

  const conditions = [];
  const binds = [];

  // Add filters if provided
  if (filters.company_name) {
    conditions.push('COMPANY_NAME = ?');
    binds.push(filters.company_name);
  }
  if (filters.invtype) {
    conditions.push('UPPER(INVTYPE) = ?');
    binds.push(filters.invtype.toUpperCase());
  }
  if (filters.model) {
    conditions.push('MODEL = ?');
    binds.push(filters.model);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += `
    GROUP BY COMPANY_NAME, INVNO, MODEL, GB, QBO_TRANSACTION_DATE, UPPER(INVTYPE)
    ORDER BY QBO_TRANSACTION_DATE DESC
  `;

  console.log('Executing customer data query');
  return await executeQuery(query, binds);
}

/**
 * Fetch historical data aggregated by date
 * @param {number} year - Year to filter
 * @param {number} month - Month to filter (1-12)
 * @returns {Promise<Array>} Historical records
 */
async function fetchHistoricalData(year, month) {
  const query = `
    SELECT
      DATE(QBO_TRANSACTION_DATE) as TRANSACTION_DATE,
      COUNT(DISTINCT INVNO) as INVOICE_COUNT,
      COUNT(*) as TOTAL_UNITS,
      SUM(PRICE) as TOTAL_REVENUE
    FROM SCAL_DAG.B2B_OUTBOUND.B2B_OUTBOUND_LOGS
    WHERE YEAR(QBO_TRANSACTION_DATE) = ?
      AND MONTH(QBO_TRANSACTION_DATE) = ?
    GROUP BY DATE(QBO_TRANSACTION_DATE)
    ORDER BY TRANSACTION_DATE
  `;

  console.log(`Executing historical data query for ${year}-${month}`);
  return await executeQuery(query, [year, month]);
}

/**
 * Test Snowflake connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const result = await executeQuery('SELECT CURRENT_VERSION() as VERSION, CURRENT_WAREHOUSE() as WAREHOUSE');
    console.log('Snowflake connection test successful:', result[0]);
    return true;
  } catch (error) {
    console.error('Snowflake connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  createConnection,
  executeQuery,
  fetchIMEIData,
  fetchCustomerData,
  fetchHistoricalData,
  testConnection
};
