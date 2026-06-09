const { NodeSSH } = require('node-ssh');

async function checkRootEnv() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking root .env...");
    const r1 = await ssh.execCommand('cat /var/www/vocabjp/.env');
    console.log(r1.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkRootEnv();
