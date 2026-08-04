const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://poke.idleworld.online/api/game/market', {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZkYW1pYW8xNzAwQGdtYWlsLmNvbSIsImlzQWRtaW4iOmZhbHNlLCJpc0RldiI6ZmFsc2UsInN1YiI6ImNtcm12bzJobTg0MjhiNDVrdmV5NmUzaG4iLCJpYXQiOjE3ODQ4NDE4NDcsImV4cCI6MTc4NTQ0NjY0N30._95NI0eQtn_FWoXNnAjlevhklu8llAaypYF9mNmx2iA' }
    });
    
    if (res.data.catalog) {
       console.log('Catalog typeof:', typeof res.data.catalog);
       if (typeof res.data.catalog === 'object') {
           const keys = Object.keys(res.data.catalog);
           for (const k of keys) {
               if (JSON.stringify(res.data.catalog[k]).toLowerCase().includes('cocoon')) {
                   console.log('Match:', k, res.data.catalog[k]);
               }
           }
       }
    }
  } catch(e) { console.log(e.response ? e.response.status : e.message); }
}
test();
