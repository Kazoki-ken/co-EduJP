const { NodeSSH } = require('node-ssh');

async function checkBot() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking logs for Telegram Bot...");
    const r1 = await ssh.execCommand('pm2 logs --lines 200 --nostream | grep "Telegram Bot"');
    console.log(r1.stdout);
    if(r1.stderr) console.error(r1.stderr);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkBot();
