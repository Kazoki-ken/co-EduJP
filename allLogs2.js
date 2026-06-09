const { NodeSSH } = require('node-ssh');

async function allLogs2() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking all logs for 0...");
    const r1 = await ssh.execCommand('pm2 logs 0 --lines 100 --nostream');
    console.log(r1.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
allLogs2();
