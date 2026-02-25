require('dotenv').config();

const { sendFollowUps } = require('./jobs/sendFollowUps');

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[runner] start ${startedAt}`);

  const result = await sendFollowUps();

  console.log('[runner] completed', {
    scanned: result.scanned,
    attempted: result.attempted,
    sent: result.sent,
    drafted: result.drafted,
    skipped: result.skipped,
    failed: result.failed,
  });
}

main().catch((error) => {
  console.error('[runner] fatal', error);
  process.exitCode = 1;
});
