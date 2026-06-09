const { NodeSSH } = require('node-ssh');

async function dbPush() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Running prisma db push on VPS...");
    const r1 = await ssh.execCommand('npx prisma db push --accept-data-loss', { cwd: '/var/www/vocabjp/apps/backend' });
    console.log("DB Push Output:", r1.stdout);
    if(r1.stderr) console.error("DB Push Error:", r1.stderr);

    console.log("Restarting backend PM2...");
    const r2 = await ssh.execCommand('pm2 reload vocabjp-backend');
    console.log("Reload Output:", r2.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
dbPush();
