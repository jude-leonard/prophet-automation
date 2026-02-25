const { google } = require('googleapis');

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON');
  }
}

function createSheetsClient() {
  const creds = getServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SHEETS_SCOPES,
  });

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
