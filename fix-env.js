const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({ host: '37.60.242.217', username: 'root', password: 'UzLion8118KenKazoki' }).then(async () => {
  const code = `
  const fs = require('fs');
  const path = '/var/www/vocabjp/apps/backend/.env';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/DATABASE_URL=.*/, 'DATABASE_URL="postgresql://vocabjp:vocabjp_secret@127.0.0.1:5432/vocabjp?connection_limit=30&pool_timeout=20"');
  fs.writeFileSync(path, content);
  `;
  await ssh.execCommand(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, '')}"`);
  const r = await ssh.execCommand('pm2 reload vocabjp-backend');
  console.log(r.stdout);
  ssh.dispose();
});
