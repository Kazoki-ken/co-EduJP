const { NodeSSH } = require('node-ssh');

async function fixRealEnv() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Pulling repo...");
    await ssh.execCommand('git pull origin main', { cwd: '/root/co' });
    await ssh.execCommand('rsync -a /root/co/ /var/www/vocabjp/');
    
    console.log("Updating real .env...");
    await ssh.execCommand('echo "TELEGRAM_BOT_TOKEN=8959102223:AAG4SvMC4g2hcD0l8XYCWG9Vd3aH89KJkMg" >> /var/www/vocabjp/apps/backend/.env');
    await ssh.execCommand('echo "TELEGRAM_BOT_USERNAME=edujp_auth_bot" >> /var/www/vocabjp/apps/backend/.env');
    
    console.log("Rebuilding backend...");
    await ssh.execCommand('pnpm install && pnpm run build', { cwd: '/var/www/vocabjp/apps/backend' });

    console.log("Restarting PM2 backend...");
    const r1 = await ssh.execCommand('pm2 restart vocabjp-backend --update-env');
    console.log(r1.stdout);
    
    console.log("Checking logs...");
    const r2 = await ssh.execCommand('pm2 logs 0 --lines 50 --nostream');
    console.log(r2.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
fixRealEnv();
