const { NodeSSH } = require('node-ssh');

async function checkGit() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    const r1 = await ssh.execCommand('git pull origin main', { cwd: '/root/co' });
    console.log("Git Pull:", r1.stdout);
    if(r1.stderr) console.error("Git Pull Error:", r1.stderr);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
checkGit();
