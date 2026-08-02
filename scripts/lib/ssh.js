/**
 * Shared SSH connector for the deployment scripts.
 *
 * Credentials are read from environment variables ONLY — never hardcode them.
 * Create a `.env.deploy` file in the repo root (it is gitignored):
 *
 *   DEPLOY_HOST=1.2.3.4
 *   DEPLOY_USER=deploy
 *   DEPLOY_PORT=22
 *   DEPLOY_SSH_KEY=C:\Users\me\.ssh\id_ed25519     # preferred
 *   # DEPLOY_PASSWORD=...                          # fallback, less secure
 *   DEPLOY_APP_DIR=/var/www/vocabjp
 */
const fs = require('fs');
const path = require('path');
const { NodeSSH } = require('node-ssh');

// Load .env.deploy from the repo root if present (minimal parser — no extra deps).
const envFile = path.resolve(__dirname, '../../.env.deploy');
if (fs.existsSync(envFile)) {
  for (const rawLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Real environment variables always win over the file.
    if (!(key in process.env)) process.env[key] = value;
  }
}

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        'Set it in .env.deploy (see .env.deploy.example) or export it in your shell.',
    );
  }
  return value;
};

const APP_DIR = process.env.DEPLOY_APP_DIR || '/var/www/vocabjp';

/** Opens an SSH connection using key auth when available, password otherwise. */
async function connect() {
  const ssh = new NodeSSH();

  const config = {
    host: requireEnv('DEPLOY_HOST'),
    username: requireEnv('DEPLOY_USER'),
    port: parseInt(process.env.DEPLOY_PORT || '22', 10),
    readyTimeout: 20000,
  };

  const keyPath = process.env.DEPLOY_SSH_KEY;
  if (keyPath) {
    config.privateKeyPath = keyPath;
    if (process.env.DEPLOY_SSH_PASSPHRASE) {
      config.passphrase = process.env.DEPLOY_SSH_PASSPHRASE;
    }
  } else {
    config.password = requireEnv('DEPLOY_PASSWORD');
  }

  await ssh.connect(config);
  return ssh;
}

/** Runs a command remotely, streaming output, and throws on a non-zero exit code. */
async function run(ssh, command, options = {}) {
  const cwd = options.cwd ?? APP_DIR;
  console.log(`\n$ (${cwd}) ${command}`);

  const result = await ssh.execCommand(command, {
    cwd,
    onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
    onStderr: (chunk) => process.stderr.write(chunk.toString('utf8')),
  });

  if (result.code !== 0 && !options.allowFailure) {
    throw new Error(`Command failed (exit ${result.code}): ${command}`);
  }
  return result;
}

module.exports = { connect, run, APP_DIR };
