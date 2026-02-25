const { appendSheetRow } = require('./sheets');

async function appendEmailLog({
  spreadsheetId,
  tabName,
  rowNumber,
  recipient,
  subject,
  templateKey,
  outcome,
  externalId,
  error,
}) {
  const now = new Date().toISOString();
  const values = [
    now,
    rowNumber,
    recipient,
    subject,
    templateKey,
    outcome,
    externalId || '',
    error || '',
  ];

  await appendSheetRow({
    spreadsheetId,
    tabName,
    values,
  });
}

module.exports = {
  appendEmailLog,
};
