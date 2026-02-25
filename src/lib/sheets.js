const { google } = require('googleapis');

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function parseServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON');
  }
}

function createAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth2callback');
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  const creds = parseServiceAccountCredentials();
  if (creds) {
    return new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: SHEETS_SCOPES,
    });
  }

  throw new Error('Sheets auth not configured. Use personal OAuth vars or GOOGLE_SERVICE_ACCOUNT_JSON.');
}

function createSheetsClient() {
  const auth = createAuthClient();
  return google.sheets({ version: 'v4', auth });
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function readSheetRows({ spreadsheetId, tabName }) {
  const sheets = createSheetsClient();
  const range = `${tabName}!A1:ZZ`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row, index) => {
    const mapped = { row_number: index + 2 };

    headers.forEach((header, i) => {
      mapped[header || `column_${i + 1}`] = row[i] || '';
    });

    return mapped;
  });
}

async function appendSheetRow({ spreadsheetId, tabName, values }) {
  const sheets = createSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values],
    },
  });
}

module.exports = {
  readSheetRows,
  appendSheetRow,
};
