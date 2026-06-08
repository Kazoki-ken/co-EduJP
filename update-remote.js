const { NodeSSH } = require('node-ssh');

async function updateServer() {
  const ssh = new NodeSSH();
  
  try {
    console.log("Connecting to server...");
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki',
      readyTimeout: 10000
    });
    
    console.log("Connected! Updating PM2 config...");
    
    // 1. Update PM2 to use cluster mode
    const pm2Result = await ssh.execCommand('pm2 delete all && cd /var/www/vocabjp/apps/backend && pm2 start dist/index.js --name "vocabjp-backend" -i max && pm2 save');
    console.log("PM2 Result:", pm2Result.stdout);
    if (pm2Result.stderr) console.error("PM2 Error:", pm2Result.stderr);

    // 2. Update Prisma Connection Pooling in .env
    console.log("Updating Database URL for pooling...");
    const envResult = await ssh.execCommand('sed -i "s/DATABASE_URL=.*/DATABASE_URL=\\"postgresql:\\/\\/vocabjp:vocabjp_secret@127.0.0.1:5432\\/vocabjp?connection_limit=20&pool_timeout=10\\"/g" /var/www/vocabjp/apps/backend/.env');
    console.log("Env update:", envResult.stdout);
    
    console.log("Restarting backend to apply env changes...");
    const restartResult = await ssh.execCommand('pm2 reload vocabjp-backend');
    console.log("Restart result:", restartResult.stdout);

    console.log("SUCCESS!");
    ssh.dispose();
  } catch (error) {
    console.error("Connection failed:", error);
    ssh.dispose();
  }
}

updateServer();
