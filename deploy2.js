const { NodeSSH } = require('node-ssh');

async function deploy2() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    console.log("Checking /root/co...");
    const r1 = await ssh.execCommand('git status', { cwd: '/root/co' });
    console.log("Status /root/co:", r1.stdout);
    if(r1.stderr) console.error("Error /root/co:", r1.stderr);

    console.log("Checking /var/www/vocabjp...");
    const r2 = await ssh.execCommand('git status', { cwd: '/var/www/vocabjp' });
    console.log("Status /var/www/vocabjp:", r2.stdout);
    if(r2.stderr) console.error("Error /var/www/vocabjp:", r2.stderr);

    ssh.dispose();
  } catch(e) {
    console.error(e);
  }
}
deploy2();
