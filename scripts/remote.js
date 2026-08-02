/**
 * Runs an arbitrary command on the production VPS.
 *
 * Replaces the old one-off check / fix / pm2 helper scripts.
 *
 * Usage:
 *   node scripts/remote.js "pm2 logs vocabjp-backend --lines 100 --nostream"
 *   node scripts/remote.js "pm2 status"
 *   node scripts/remote.js --cwd apps/backend "pnpm prisma migrate status"
 */
const { connect, run, APP_DIR } = require('./lib/ssh');

const args = process.argv.slice(2);

let cwd = APP_DIR;
const cwdIndex = args.indexOf('--cwd');
if (cwdIndex !== -1) {
  const value = args[cwdIndex + 1];
  if (!value) {
    console.error('--cwd requires a path argument');
    process.exit(1);
  }
  cwd = value.startsWith('/') ? value : `${APP_DIR}/${value}`;
  args.splice(cwdIndex, 2);
}

const command = args.join(' ').trim();
if (!command) {
  console.error('Usage: node scripts/remote.js [--cwd <dir>] "<command>"');
  process.exit(1);
}

(async () => {
  const ssh = await connect();
  try {
    await run(ssh, command, { cwd, allowFailure: true });
  } finally {
    ssh.dispose();
  }
})().catch((err) => {
  console.error('\n❌ Remote command failed:', err.message);
  process.exit(1);
});
