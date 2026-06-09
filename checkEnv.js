const { NodeSSH } = require('node-ssh');

async function checkEnv() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking .env for token...");
    const r1 = await ssh.execCommand('grep TELEGRAM_BOT_TOKEN /var/www/vocabjp/apps/backend/.env');
    console.log(r1.stdout);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkEnv();
