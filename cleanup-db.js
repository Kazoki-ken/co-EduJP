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
          console.log('Deleting progress...');
          const progress = await prisma.userWordProgress.deleteMany({});
          console.log('Deleting notes...');
          const notes = await prisma.userWordNote.deleteMany({});
          console.log('Deleting saved words...');
          const savedWords = await prisma.savedWord.deleteMany({});
          console.log('Deleting saved topics...');
          const savedTopics = await prisma.savedTopic.deleteMany({});
          console.log('Deleting saved books...');
          const savedBooks = await prisma.savedBook.deleteMany({});
          console.log('Deleting word topics...');
          const wordTopics = await prisma.wordTopic.deleteMany({});
          console.log('Deleting words...');
          const words = await prisma.word.deleteMany({});
          console.log('Deleting topics...');
          const topics = await prisma.topic.deleteMany({});
          console.log('Deleting books...');
          const books = await prisma.book.deleteMany({});
          
          console.log('SUCCESS_DELETED:');
          console.log('Progress: ' + progress.count);
          console.log('Notes: ' + notes.count);
          console.log('SavedWords: ' + savedWords.count);
          console.log('SavedTopics: ' + savedTopics.count);
          console.log('SavedBooks: ' + savedBooks.count);
          console.log('WordTopics: ' + wordTopics.count);
          console.log('Words: ' + words.count);
          console.log('Topics: ' + topics.count);
          console.log('Books: ' + books.count);
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
