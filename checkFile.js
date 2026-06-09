const { NodeSSH } = require('node-ssh');

async function checkFile() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    const r1 = await ssh.execCommand('cat /var/www/vocabjp/apps/backend/src/middleware/auth.middleware.ts | head -n 15');
    console.log("File content on VPS:", r1.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkFile();
