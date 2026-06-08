const { NodeSSH } = require('node-ssh');

async function findDir() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki'
    });
    
    const result = await ssh.execCommand('find / -name "package.json" -type f -maxdepth 4');
    console.log("Directories:", result.stdout);
    ssh.dispose();
  } catch (error) {
    console.error(error);
  }
}
findDir();
