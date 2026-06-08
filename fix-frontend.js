const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({ host: '37.60.242.217', username: 'root', password: 'UzLion8118KenKazoki' }).then(async () => {
  const r = await ssh.execCommand('cd /var/www/vocabjp/apps/frontend && pm2 start npm --name "vocabjp-frontend" -- start && pm2 save');
  console.log(r.stdout);
  ssh.dispose();
});
