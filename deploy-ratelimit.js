const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function deployRateLimiter() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki',
      readyTimeout: 10000
    });
    
    console.log("Connected to server...");
    
    console.log("Installing express-rate-limit...");
    const installRes = await ssh.execCommand('cd /var/www/vocabjp/apps/backend && pnpm add express-rate-limit');
    console.log(installRes.stdout);
    if(installRes.stderr) console.error(installRes.stderr);

    console.log("Uploading files...");
    await ssh.putFile('c:/Users/user/Desktop/co/apps/backend/src/middleware/rateLimiter.middleware.ts', '/var/www/vocabjp/apps/backend/src/middleware/rateLimiter.middleware.ts');
    await ssh.putFile('c:/Users/user/Desktop/co/apps/backend/src/routes/auth.routes.ts', '/var/www/vocabjp/apps/backend/src/routes/auth.routes.ts');
    
    console.log("Building backend...");
    const buildRes = await ssh.execCommand('cd /var/www/vocabjp/apps/backend && pnpm build');
    console.log(buildRes.stdout);
    if(buildRes.stderr) console.error(buildRes.stderr);

    console.log("Restarting PM2 cluster...");
    const pm2Res = await ssh.execCommand('pm2 reload vocabjp-backend');
    console.log(pm2Res.stdout);
    
    console.log("Deployment complete!");
  } catch(e) {
    console.error(e);
  } finally {
    ssh.dispose();
  }
}

deployRateLimiter();
