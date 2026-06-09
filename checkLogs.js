const { NodeSSH } = require('node-ssh');

async function checkLogs() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("PM2 Logs:");
    const r1 = await ssh.execCommand('pm2 logs --lines 50 --nostream');
    console.log(r1.stdout);
    if(r1.stderr) console.error(r1.stderr);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkLogs();
