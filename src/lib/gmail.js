const { google } = require('googleapis');

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
];

function parseServiceAccountJson() {
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
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  const serviceCreds = parseServiceAccountJson();
  const impersonatedUser = process.env.GMAIL_IMPERSONATE_USER;
  if (serviceCreds && impersonatedUser) {
    return new google.auth.JWT({
      email: serviceCreds.client_email,
      key: serviceCreds.private_key,
      scopes: GMAIL_SCOPES,
      subject: impersonatedUser,
    });
  }

  throw new Error(
    'Gmail auth not configured. Use OAuth vars (client id/secret + refresh token) or service account + GMAIL_IMPERSONATE_USER.'
  );
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildRawMessage({ from, to, subject, body }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ];

  return toBase64Url(lines.join('\r\n'));
}

async function sendOrDraftEmail({ to, subject, body, dryRun }) {
  const from = process.env.GMAIL_FROM;
  if (!from) {
    throw new Error('Missing GMAIL_FROM');
  }

  const auth = createAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildRawMessage({ from, to, subject, body });

  if (dryRun) {
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw },
      },
    });

    return { status: 'drafted', id: response.data.id || '' };
  }

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { status: 'sent', id: response.data.id || '' };
}

module.exports = {
  sendOrDraftEmail,
};
