const axios = require('axios');

const BASE_URL = 'https://edujp.uz/api';
const CONCURRENCY = 1;
const TOPIC_ID = 'cmpwrkdxp000514kusxy3tnms'; // "1-mavzu"

async function runUserFlow(workerId) {
  const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });
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
       throw new Error("No words in session: " + JSON.stringify(session));
    }

    const answers = words.map(w => ({
      wordId: w.wordId || w.id,
      answer: 'test_answer'
    }));
    
    const payload = {
      sessionId: sessionId,
      answers: answers
    };

    console.log("Submitting payload:", JSON.stringify(payload, null, 2));
    
    await api.post('/games/submit', payload);
    
    console.log("Success!");
  } catch (e) {
    if (e.response) {
       console.error("HTTP ERROR:", e.response.status, e.response.data);
    } else {
       console.error("ERROR:", e.message);
    }
  }
}

runUserFlow(1);
