const axios = require('axios');

const BASE_URL = 'https://edujp.uz/api';
const CONCURRENCY = 20; 
const DURATION = 30; 
const TOPIC_ID = 'cmpwrkdxp000514kusxy3tnms'; // "1-mavzu"

let successCount = 0;
let errorCount = 0;
let isRunning = true;

async function runUserFlow(workerId) {
  const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });
  
  while (isRunning) {
    try {
      const username = `gamer_${Date.now()}_${workerId}_${Math.floor(Math.random()*1000)}`;
      const resAuth = await api.post('/auth/register', {
        username: username,
        email: `${username}@test.com`,
        password: 'password123'
      });
      
      const token = resAuth.data.accessToken;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await api.post(`/topics/${TOPIC_ID}/save`);
      
      const resSession = await api.get(`/games/session?limit=50&topicId=${TOPIC_ID}`);
      const session = resSession.data;
      
      const words = session.words || session.data?.words || session.session?.words;
      const sessionId = session.id || session.sessionId || session.session?.id;

      if (!words || words.length === 0) {
         throw new Error("No words in session");
      }

      const answers = words.map(w => ({
        wordId: w.wordId || w.id,
        answer: 'test_answer'
      }));
      
      await api.post('/games/submit', {
        sessionId: sessionId,
        answers: answers
      });
      
      successCount++;
    } catch (e) {
      errorCount++;
    }
  }
}

console.log(`Starting complex load test (Register -> Save Topic -> Generate Game -> Submit Game)...`);
console.log(`Concurrency: ${CONCURRENCY} parallel loops`);
console.log(`Duration: ${DURATION} seconds`);

const workers = [];
for (let i = 0; i < CONCURRENCY; i++) {
  workers.push(runUserFlow(i));
}

setTimeout(() => {
  isRunning = false;
  setTimeout(() => {
    console.log(`\n--- TEST COMPLETE ---`);
    console.log(`Total Successful Flows: ${successCount}`);
    console.log(`Total Errors: ${errorCount}`);
    process.exit(0);
  }, 3000); 
}, DURATION * 1000);
