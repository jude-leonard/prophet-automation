const { z } = require('zod');
const { readTemplate } = require('../lib/core');
const { readSheetRows } = require('../lib/sheets');
const { sendOrDraftEmail } = require('../lib/gmail');
const { appendEmailLog } = require('../lib/log');

const FollowUpRow = z
  .object({
    row_number: z.number(),
    email: z.string().optional(),
    recipient_email: z.string().optional(),
    to: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    status: z.string().optional(),
    template: z.string().optional(),
    template_key: z.string().optional(),
    subject: z.string().optional(),
    run: z.string().optional(),
    should_send: z.string().optional(),
  })
  .passthrough();

const RECIPIENT_KEYS = [
  'email',
  'recipient_email',
  'to',
  'email_address',
  'client_email',
  'lead_email',
  'contact_email',
  'agent_email',
];

const FIRST_NAME_KEYS = ['first_name', 'firstname', 'first', 'contact_first_name'];
const LAST_NAME_KEYS = ['last_name', 'lastname', 'last', 'contact_last_name'];
const GATE_KEYS = ['should_send', 'run', 'send', 'ready_to_send'];

const ALLOWED_GATE_VALUES = new Set([
  'yes',
  'y',
  'true',
  '1',
  'send',
  'ready',
  'go',
  'approved',
]);

function str(value) {
  return String(value || '').trim();
}

function isLikelyEmail(value) {
  const v = str(value);
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function pickByKeys(row, keys) {
  for (const key of keys) {
    if (str(row[key])) {
      return str(row[key]);
    }
  }
  return '';
}

function pickRecipient(row) {
  const direct = pickByKeys(row, RECIPIENT_KEYS);
  if (isLikelyEmail(direct)) {
    return direct;
  }

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== 'string') {
      continue;
    }
    if (!key.includes('email')) {
      continue;
    }
    const candidate = str(value);
    if (isLikelyEmail(candidate)) {
      return candidate;
    }
  }

  return '';
}

function shouldProcessRow(row) {
  const rawGate = pickByKeys(row, GATE_KEYS).toLowerCase();
  if (!rawGate) {
    return true;
  }

  return ALLOWED_GATE_VALUES.has(rawGate);
}

function renderTemplate(content, vars) {
  return content.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

function buildSubject(row, firstName) {
  if (row.subject && row.subject.trim()) {
    return row.subject.trim();
  }

  return firstName ? `Quick follow-up, ${firstName}` : 'Quick follow-up';
}

function errorMessage(error) {
  if (!error) {
    return 'unknown_error';
  }

  if (error.response && error.response.data && error.response.data.error) {
    const data = error.response.data.error;
    if (typeof data === 'string') {
      return data;
    }
    if (data.message) {
      return data.message;
    }
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}

function logSkip(summary, reason, rowNumber) {
  summary.skipped += 1;
  summary.skipReasons[reason] = (summary.skipReasons[reason] || 0) + 1;

  if (summary.skipSamples.length < 10) {
    summary.skipSamples.push({ rowNumber, reason });
  }
}

function logFailure(summary, rowNumber, message) {
  summary.failed += 1;
  summary.failReasons[message] = (summary.failReasons[message] || 0) + 1;

  if (summary.failSamples.length < 10) {
    summary.failSamples.push({ rowNumber, message });
  }
}

async function sendFollowUps() {
  const spreadsheetId = process.env.SHEET_ID;
  const followUpTab = process.env.FOLLOW_UP_TAB || 'Agent Follow Up';
  const emailLogTab = process.env.EMAIL_LOG_TAB || 'Email Log';
  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() === 'true';

  if (!spreadsheetId) {
    throw new Error('Missing SHEET_ID');
  }

  const rows = await readSheetRows({
    spreadsheetId,
    tabName: followUpTab,
  });

  const summary = {
    scanned: rows.length,
    attempted: 0,
    sent: 0,
    drafted: 0,
    skipped: 0,
    failed: 0,
    skipReasons: {},
    skipSamples: [],
    failReasons: {},
    failSamples: [],
  };

  for (const rawRow of rows) {
    const parsed = FollowUpRow.safeParse(rawRow);
    if (!parsed.success) {
      logSkip(summary, 'invalid_row_shape', rawRow && rawRow.row_number ? rawRow.row_number : null);
      continue;
    }

    const row = parsed.data;
    const rowNumber = row.row_number;
    const recipient = pickRecipient(row);

    if (!recipient) {
      logSkip(summary, 'missing_recipient_email', rowNumber);
      continue;
    }

    if (!shouldProcessRow(row)) {
      logSkip(summary, 'gate_not_approved', rowNumber);
      continue;
    }

    summary.attempted += 1;

    const templateKey = str(row.template_key || row.template || 'follow_up');
    const firstName = pickByKeys(row, FIRST_NAME_KEYS);
    const lastName = pickByKeys(row, LAST_NAME_KEYS);
    const subject = buildSubject(row, firstName);

    try {
      const template = readTemplate(templateKey);
      const body = renderTemplate(template, {
        first_name: firstName,
        last_name: lastName,
        status: str(row.status),
        email: recipient,
      });

      const result = await sendOrDraftEmail({
        to: recipient,
        subject,
        body,
        dryRun,
      });

      if (result.status === 'sent') {
        summary.sent += 1;
      } else {
        summary.drafted += 1;
      }

      await appendEmailLog({
        spreadsheetId,
        tabName: emailLogTab,
        rowNumber,
        recipient,
        subject,
        templateKey,
        outcome: result.status,
        externalId: result.id,
      });
    } catch (error) {
      const message = errorMessage(error);
      logFailure(summary, rowNumber, message);

      await appendEmailLog({
        spreadsheetId,
        tabName: emailLogTab,
        rowNumber,
        recipient,
        subject,
        templateKey,
        outcome: 'failed',
        error: message,
      });
    }
  }

  return summary;
}

module.exports = {
  sendFollowUps,
};
