/**
 * Deploys the current main branch to the production VPS.
 *
 * Usage:
 *   node scripts/deploy.js               # full deploy
 *   node scripts/deploy.js --skip-build  # pull + migrate + restart only
 *
 * Credentials come from .env.deploy — see scripts/lib/ssh.js.
 */
const { connect, run, APP_DIR } = require('./lib/ssh');

const skipBuild = process.argv.includes('--skip-build');

async function deploy() {
  const ssh = await connect();

  try {
    console.log(`Connected to ${process.env.DEPLOY_HOST}. Deploying to ${APP_DIR}...`);

    await run(ssh, 'git pull --ff-only');
    await run(ssh, 'pnpm install --frozen-lockfile');

    await run(ssh, 'pnpm prisma migrate deploy', { cwd: `${APP_DIR}/apps/backend` });
    await run(ssh, 'pnpm prisma generate', { cwd: `${APP_DIR}/apps/backend` });

    if (!skipBuild) {
      await run(ssh, 'pnpm build', { cwd: `${APP_DIR}/apps/backend` });
      await run(ssh, 'pnpm build', { cwd: `${APP_DIR}/apps/frontend` });
    }

    await run(ssh, 'pm2 reload all --update-env');
    await run(ssh, 'pm2 status');

    console.log('\n✅ Deployed successfully.');
  } finally {
    ssh.dispose();
  }
}

deploy().catch((err) => {
  console.error('\n❌ Deploy failed:', err.message);
  process.exit(1);
});
