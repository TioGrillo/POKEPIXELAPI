const axios = require('axios');

const TOKEN_MAIN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZkYW1pYW8xNzAwQGdtYWlsLmNvbSIsImlzQWRtaW4iOmZhbHNlLCJpc0RldiI6ZmFsc2UsInN1YiI6ImNtcm12bzJobTg0MjhiNDVrdmV5NmUzaG4iLCJpYXQiOjE3ODQ4NDE4NDcsImV4cCI6MTc4NTQ0NjY0N30._95NI0eQtn_FWoXNnAjlevhklu8llAaypYF9mNmx2iA';
const TOKEN_SENDER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZkYW1pYW8xODg4QGdtYWlsLmNvbSIsImlzQWRtaW4iOmZhbHNlLCJpc0RldiI6ZmFsc2UsInN1YiI6ImNtcm12bzFmeTg3eTl3c3Q4YzI0cWY1cG0iLCJpYXQiOjE3ODQ5NzYzOTAsImV4cCI6MTc4NTU4MTE5MH0.wTVC-Fbfa5JSlqU2s3J5jE8mqWbA0UzK1kwiaNBR83g';

async function testLimit() {
  try {
    console.log('Testing limit > 100...');
    const res = await axios.post('https://poke.idleworld.online/api/game/market/action', {
      action: 'request-create',
      kind: 'item',
      refId: 23, // Cocoon Stone
      amount: 101, // testing if > 100 works
      price: 1
    }, {
      headers: { Authorization: `Bearer ${TOKEN_MAIN}` }
    });
    console.log('Success creating request for 101 items!', res.data);
  } catch (err) {
    console.log('Failed to create request for 101 items:', err.response ? err.response.data : err.message);
  }
}

testLimit();
