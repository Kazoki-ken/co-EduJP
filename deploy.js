const { NodeSSH } = require('node-ssh');

async function deploy() {
  const ssh = new NodeSSH();
  
  try {
    console.log("Connecting to server...");
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki',
      readyTimeout: 10000
    });
    
    console.log("Connected! Pulling latest changes from Github...");
    
    // 1. Pull changes
    const pullResult = await ssh.execCommand('git pull', { cwd: '/var/www/vocabjp' });
    console.log("Git Pull:", pullResult.stdout);
    if (pullResult.stderr) console.error("Git Pull Error:", pullResult.stderr);

    // 2. Add Telegram token to backend .env
    console.log("Updating backend .env...");
    await ssh.execCommand('grep -q "TELEGRAM_BOT_TOKEN" /var/www/vocabjp/apps/backend/.env || echo "\\nTELEGRAM_BOT_TOKEN=8959102223:AAG4SvMC4g2hcD0l8XYCWG9Vd3aH89KJkMg\\nTELEGRAM_BOT_USERNAME=edujp_auth_bot" >> /var/www/vocabjp/apps/backend/.env');

    // 3. Prisma Migrate & Build backend
    console.log("Deploying database & building backend...");
    const backendResult = await ssh.execCommand('npm install && npx prisma migrate deploy && npm run build', { cwd: '/var/www/vocabjp/apps/backend' });
    console.log("Backend build:", backendResult.stdout);
    if (backendResult.stderr) console.error("Backend error:", backendResult.stderr);

    // 4. Build Frontend
    console.log("Building frontend...");
    const frontendResult = await ssh.execCommand('npm install && npm run build', { cwd: '/var/www/vocabjp/apps/frontend' });
    console.log("Frontend build:", frontendResult.stdout);
    if (frontendResult.stderr) console.error("Frontend error:", frontendResult.stderr);

    // 5. Restart PM2
    console.log("Restarting PM2...");
    const pm2Result = await ssh.execCommand('pm2 reload all');
    console.log("PM2:", pm2Result.stdout);

    console.log("SUCCESSFULLY DEPLOYED TO VPS!");
    ssh.dispose();
  } catch (error) {
    console.error("Deploy failed:", error);
    ssh.dispose();
  }
}

deploy();
