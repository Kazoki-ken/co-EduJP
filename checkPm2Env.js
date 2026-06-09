const { NodeSSH } = require('node-ssh');

async function checkPm2Env() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking PM2 env for vocabjp-backend 0...");
    const r1 = await ssh.execCommand('pm2 env 0 | grep NODE_APP_INSTANCE');
    console.log("Instance 0:", r1.stdout);

    const r2 = await ssh.execCommand('pm2 env 1 | grep NODE_APP_INSTANCE');
    console.log("Instance 1:", r2.stdout);

    console.log("Checking if the bot logs are actually there...");
    const r3 = await ssh.execCommand('pm2 logs vocabjp-backend-0 --lines 100 --nostream | grep "Telegram Bot"');
    console.log("Logs 0:", r3.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkPm2Env();
