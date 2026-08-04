const axios = require('axios');

const TOKEN_MAIN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZkYW1pYW8xNzAwQGdtYWlsLmNvbSIsImlzQWRtaW4iOmZhbHNlLCJpc0RldiI6ZmFsc2UsInN1YiI6ImNtcm12bzJobTg0MjhiNDVrdmV5NmUzaG4iLCJpYXQiOjE3ODQ4NDE4NDcsImV4cCI6MTc4NTQ0NjY0N30._95NI0eQtn_FWoXNnAjlevhklu8llAaypYF9mNmx2iA';

async function testLimit() {
  try {
    console.log('Testing limit 4500...');
    const res = await axios.post('https://poke.idleworld.online/api/game/market/action', {
      action: 'request-create',
      kind: 'item',
      refId: 23, 
      amount: 4500,
      price: 1
    }, {
      headers: { Authorization: `Bearer ${TOKEN_MAIN}` }
    });
    console.log('Success creating request for 4500 items!', res.data);
  } catch (err) {
    console.log('Failed to create request for 4500 items:', err.response ? err.response.data : err.message);
  }
}

testLimit();
