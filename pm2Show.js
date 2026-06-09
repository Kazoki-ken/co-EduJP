const { NodeSSH } = require('node-ssh');

async function pm2Show() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("PM2 show vocabjp-backend:");
    const r1 = await ssh.execCommand('pm2 show vocabjp-backend');
    console.log(r1.stdout);
    
    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
pm2Show();
