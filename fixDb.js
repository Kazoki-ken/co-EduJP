const { NodeSSH } = require('node-ssh');

async function fixDb() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking DB migrations...");
    const r1 = await ssh.execCommand('npx prisma migrate status', { cwd: '/var/www/vocabjp/apps/backend' });
    console.log("Status:", r1.stdout);
    if(r1.stderr) console.error("Error:", r1.stderr);

    console.log("Deploying migrations...");
    const r2 = await ssh.execCommand('npx prisma migrate deploy', { cwd: '/var/www/vocabjp/apps/backend' });
    console.log("Deploy:", r2.stdout);
    if(r2.stderr) console.error("Deploy Error:", r2.stderr);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
fixDb();
