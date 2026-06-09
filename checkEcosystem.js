const { NodeSSH } = require('node-ssh');

async function checkEcosystem() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking ecosystem config...");
    const r1 = await ssh.execCommand('cat /var/www/vocabjp/ecosystem.config.js');
    console.log(r1.stdout);
    
    const r2 = await ssh.execCommand('cat /var/www/vocabjp/apps/backend/ecosystem.config.js');
    console.log(r2.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkEcosystem();
