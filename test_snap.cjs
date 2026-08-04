const https = require('https');
async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'pokepixel.nietore.com', port: 443, path: `/api/v1${path}`, method: method.toUpperCase(), headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const r = https.request(opts, (res) => { let b = ''; res.on('data', d => b += d); res.on('end', () => { let p; try { p = JSON.parse(b); } catch(e) { p = b; } resolve({ status: res.statusCode, data: p }); }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
async function main() {
  const loginRes = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  const token = loginRes.data.access_token;
  console.log('Logged in! Token:', !!token);

  // 1. Check snapshot BEFORE prepare
  const snap1 = await req('GET', '/hunts/current/snapshot', null, token);
  console.log('\n=== SNAPSHOT BEFORE PREPARE ===');
  console.log('Status:', snap1.status);
  console.log('Full snapshot:', JSON.stringify(snap1.data?.snapshot, null, 2));

  // 2. Do prepare
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  console.log('\n=== PREPARE RESPONSE ===');
  console.log('Status:', prep.status);
  console.log('Full allocation:', JSON.stringify(prep.data?.allocation, null, 2));

  const alloc = prep.data?.allocation || {};
  const trainerId = alloc.trainer_id || alloc.id?.split(':')[0] || '';
  const mapId = alloc.map_id;
  const zoneId = alloc.zone_id;
  const level = alloc.level;
  const speciesId = alloc.species_id;

  console.log('\nExtracted: trainerId=', trainerId, ' mapId=', mapId, ' zoneId=', zoneId?.substring(0,8));

  // 3. Fetch wild-monsters
  const events = Array.from({length: 20}, (_, i) => `${trainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const wild = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`\n=== WILD MONSTERS (trainerId format) ===`);
  console.log(`Status: ${wild.status} | ${monsters.length} total | ${alive.length} alive | respawn: ${wild.data?.respawn_seconds}s`);
  if (alive.length > 0) {
    console.log('Sample alive monster:', JSON.stringify(alive[0], null, 2));
  }

  // 4. Also try old N:speciesId format
  const events2 = Array.from({length: 20}, (_, i) => `${i+1}:${speciesId}`).join(',');
  const wild2 = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events2)}&level=${level}`, null, token);
  const monsters2 = wild2.data?.data || [];
  const alive2 = monsters2.filter(m => m.hp > 0);
  console.log(`\n=== WILD MONSTERS (N:species format) ===`);
  console.log(`Status: ${wild2.status} | ${monsters2.length} total | ${alive2.length} alive`);
  if (alive2.length > 0) {
    console.log('Sample alive monster:', JSON.stringify(alive2[0], null, 2));
  }

  // 5. Snapshot AFTER prepare
  await new Promise(r => setTimeout(r, 1000));
  const snap2 = await req('GET', '/hunts/current/snapshot', null, token);
  console.log('\n=== SNAPSHOT AFTER PREPARE ===');
  console.log('Full snapshot:', JSON.stringify(snap2.data?.snapshot, null, 2));
}
main().catch(e => console.error(e));
