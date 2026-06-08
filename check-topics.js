const axios = require('axios');

async function testApi() {
  const api = axios.create({ baseURL: 'https://edujp.uz/api' });
  try {
    const { data } = await api.get('/topics');
    const topics = data.data || data;
    console.log("Topics available:");
    topics.forEach(t => console.log(`- ${t.name} (ID: ${t.id})`));
  } catch (e) {
    console.error(e.message);
  }
}
testApi();
