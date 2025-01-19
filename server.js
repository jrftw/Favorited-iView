const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors'); // Add CORS middleware

const app = express();
const port = process.env.PORT || 3000;

// Use CORS middleware to allow requests from your WordPress domain
app.use(cors({
  origin: 'https://infinitumlive.com', // Replace with your WordPress domain
}));

app.use(bodyParser.json());

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
const CLIENT_EMAIL = serviceAccount.client_email;
const PRIVATE_KEY = serviceAccount.private_key;

const sheets = google.sheets('v4');
const SPREADSHEET_ID = '14Fu1TT9XgHe63IMewEII6okuyHXL0d7o6DzZfnqmxhs';

const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
  'https://www.googleapis.com/auth/spreadsheets',
]);

app.post('/login', async (req, res) => {
  const { username, phone } = req.body;

  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:C',
    });

    const rows = response.data.values;
    if (!rows) {
      return res.status(400).json({ status: 'fail', message: 'No data found' });
    }

    const user = rows.find((row) => row[0] === username && row[2] === phone);
    if (user) {
      res.json({ status: 'success', message: 'Login successful!' });
    } else {
      res.status(401).json({ status: 'fail', message: 'Invalid username or phone number.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Server error.' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
