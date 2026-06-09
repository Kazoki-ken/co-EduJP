const { NodeSSH } = require('node-ssh');

async function checkDist() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking dist/services...");
    const r1 = await ssh.execCommand('ls -la /var/www/vocabjp/apps/backend/dist/services');
    console.log(r1.stdout);

    console.log("Checking index.js...");
    const r2 = await ssh.execCommand('cat /var/www/vocabjp/apps/backend/dist/index.js | tail -n 20');
    console.log(r2.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkDist();
