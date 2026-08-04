const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/Damiao/Desktop/capturaautomaticas.har', 'utf8'));
data.log.entries.forEach(e => {
  if (e.request.url.includes('/hunts/current') && e.request.postData && e.request.postData.text) {
    if (e.request.postData.text.includes('158:24') || e.request.postData.text.includes('"event_id":24')) {
      console.log(e.startedDateTime, 'REQ:', e.request.url);
    }
  }
});
