const { NodeSSH } = require('node-ssh');

async function deployFix() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Pulling repo in /root/co...");
    await ssh.execCommand('git pull origin main', { cwd: '/root/co' });

    console.log("Copying to /var/www/vocabjp...");
    await ssh.execCommand('cp -r /root/co/* /var/www/vocabjp/');

    console.log("Using pnpm to build backend...");
    const r1 = await ssh.execCommand('pnpm install --ignore-scripts && npx prisma generate && npx prisma migrate deploy && pnpm run build', { cwd: '/var/www/vocabjp/apps/backend' });
    console.log(r1.stdout);
    if(r1.stderr) console.error(r1.stderr);

    console.log("Using pnpm to build frontend...");
    const r2 = await ssh.execCommand('pnpm install --ignore-scripts && pnpm run build', { cwd: '/var/www/vocabjp/apps/frontend' });
    console.log(r2.stdout);
    if(r2.stderr) console.error(r2.stderr);

    console.log("Reloading PM2...");
    const r3 = await ssh.execCommand('pm2 reload all');
    console.log(r3.stdout);
    
    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
deployFix();
