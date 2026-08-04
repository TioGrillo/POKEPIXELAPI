const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT4.har', 'utf8');
const items = content.split('<item>');

// Find a wild-monsters call that actually returned data (non-empty array)
for(const item of items) {
  if(item.includes('wild-monsters')) {
    const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(urlMatch && resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        const data = parsed.data || [];
        if(data.length > 0) {
          // Decode the events query param from URL
          const url = urlMatch[1];
          const eventsParam = new URL(url).searchParams.get('events');
          const mapIdParam = new URL(url).searchParams.get('map_id');
          const zoneParam = new URL(url).searchParams.get('zone_id');
          const levelParam = new URL(url).searchParams.get('level');
          const firstEvent = eventsParam?.split(',')[0];
          console.log('Events format (first):', firstEvent);
          console.log('map_id:', mapIdParam, 'zone_id:', zoneParam?.substring(0,8), 'level:', levelParam);
          console.log('Monster id format:', data[0].id);
          break;
        }
      } catch(e) {}
    }
  }
}
