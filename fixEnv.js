const { NodeSSH } = require('node-ssh');

async function fixEnv() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Reloading PM2 with new env...");
    const r1 = await ssh.execCommand('pm2 reload all --update-env');
    console.log(r1.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
fixEnv();
