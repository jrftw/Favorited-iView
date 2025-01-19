const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');
const winston = require('winston');

// Initialize Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' }) // Logs to a file
  ],
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware for CORS
app.use(cors({
  origin: 'https://infinitumlive.com', // Replace with your WordPress domain
}));

// Middleware for parsing JSON
app.use(bodyParser.json());

// Log each incoming request
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, { body: req.body });
  next();
});

// Google Sheets Service Account Configuration
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
} catch (error) {
  logger.error('Failed to parse SERVICE_ACCOUNT_JSON environment variable', { error: error.message });
  process.exit(1); // Exit if service account config is invalid
}

const CLIENT_EMAIL = serviceAccount.client_email;
const PRIVATE_KEY = serviceAccount.private_key;

const sheets = google.sheets('v4');
const SPREADSHEET_ID = '14Fu1TT9XgHe63IMewEII6okuyHXL0d7o6DzZfnqmxhs';

const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
  'https://www.googleapis.com/auth/spreadsheets',
]);

// Login Endpoint
app.post('/login', async (req, res) => {
  const { username, phone } = req.body;
  logger.info('Login attempt', { username, phone });

  if (!username || !phone) {
    logger.warn('Missing username or phone number in request body');
    return res.status(400).json({ status: 'fail', message: 'Invalid request payload' });
  }

  try {
    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:C',
    });

    const rows = response.data.values;
    logger.info('Fetched data from Google Sheets', { rows });

    if (!rows) {
      logger.warn('No data found in the spreadsheet');
      return res.status(404).json({ status: 'fail', message: 'No data found in the spreadsheet' });
    }

    // Check if user exists in the rows
    const user = rows.find((row) => row[0] === username && row[2] === phone);
    if (user) {
      logger.info('User authenticated successfully', { username, phone });
      res.json({ status: 'success', message: 'Login successful!' });
    } else {
      logger.warn('Authentication failed', { username, phone });
      res.status(401).json({ status: 'fail', message: 'Invalid username or phone number' });
    }
  } catch (error) {
    logger.error('Error during login process', { error: error.message });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Server Start
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});
