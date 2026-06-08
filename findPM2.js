const { NodeSSH } = require('node-ssh');

async function findPM2() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    const result = await ssh.execCommand('pm2 jlist');
    const apps = JSON.parse(result.stdout);
    apps.forEach(app => {
      console.log(`App: ${app.name}, Path: ${app.pm2_env.pm_cwd}`);
    });
    ssh.dispose();
  } catch (error) {
    console.error(error);
  }
}
findPM2();
