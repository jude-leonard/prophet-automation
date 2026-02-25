const { z } = require('zod');
const { readTemplate } = require('../lib/core');
const { readSheetRows } = require('../lib/sheets');
const { sendOrDraftEmail } = require('../lib/gmail');
const { appendEmailLog } = require('../lib/log');

const FollowUpRow = z.object({
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
});

function pickRecipient(row) {
  return (row.email || row.recipient_email || row.to || '').trim();
}

function shouldProcessRow(row) {
  const gate = String(row.should_send || row.run || '').trim().toLowerCase();
  if (!gate) {
    return true;
  }

  return ['yes', 'y', 'true', '1', 'send'].includes(gate);
}

function renderTemplate(content, vars) {
  return content.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const value = vars[key];
    return value == null ? '' : String(value);
  });
}

function buildSubject(row) {
  if (row.subject && row.subject.trim()) {
    return row.subject.trim();
  }

  const first = (row.first_name || '').trim();
  return first ? `Quick follow-up, ${first}` : 'Quick follow-up';
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
  };

  for (const rawRow of rows) {
    const parsed = FollowUpRow.safeParse(rawRow);
    if (!parsed.success) {
      summary.skipped += 1;
      continue;
    }

    const row = parsed.data;
    const recipient = pickRecipient(row);
    if (!recipient || !shouldProcessRow(row)) {
      summary.skipped += 1;
      continue;
    }

    summary.attempted += 1;

    const templateKey = (row.template_key || row.template || 'follow_up').trim();
    const subject = buildSubject(row);

    try {
      const template = readTemplate(templateKey);
      const body = renderTemplate(template, {
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        status: row.status || '',
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
        rowNumber: row.row_number,
        recipient,
        subject,
        templateKey,
        outcome: result.status,
        externalId: result.id,
      });
    } catch (error) {
      summary.failed += 1;

      await appendEmailLog({
        spreadsheetId,
        tabName: emailLogTab,
        rowNumber: row.row_number,
        recipient,
        subject,
        templateKey,
        outcome: 'failed',
        error: error && error.message ? error.message : String(error),
      });
    }
  }

  return summary;
}

module.exports = {
  sendFollowUps,
};
