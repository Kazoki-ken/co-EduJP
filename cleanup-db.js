const { NodeSSH } = require('node-ssh');

async function cleanupRemoteDb() {
  const ssh = new NodeSSH();
  
  try {
    console.log("Connecting to server to clean up DB...");
    await ssh.connect({
      host: '37.60.242.217',
      username: 'root',
      password: 'UzLion8118KenKazoki',
      readyTimeout: 10000
    });
    
    // Create a cleanup script on the server
    const cleanupScriptCode = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function run() {
        try {
          const result = await prisma.user.deleteMany({
            where: {
              email: {
                endsWith: '@test.com'
              }
            }
          });
          console.log('SUCCESS_DELETED: ' + result.count);
        } catch (e) {
          console.error(e);
        } finally {
          await prisma.$disconnect();
        }
      }
      run();
    `;
    
    // Upload the script content
    await ssh.execCommand(`cat << 'EOF' > /var/www/vocabjp/apps/backend/cleanup.js\n${cleanupScriptCode}\nEOF`);
    
    // Run the script on the server
    console.log("Running cleanup on server...");
    const result = await ssh.execCommand('cd /var/www/vocabjp/apps/backend && node cleanup.js');
    
    console.log("Output:");
    console.log(result.stdout);
    if (result.stderr) console.error("Error output:", result.stderr);
    
    // Remove the script
    await ssh.execCommand('rm /var/www/vocabjp/apps/backend/cleanup.js');
    
    ssh.dispose();
    console.log("Done.");
  } catch (err) {
    console.error("Failed:", err);
    if(ssh) ssh.dispose();
  }
}

cleanupRemoteDb();
