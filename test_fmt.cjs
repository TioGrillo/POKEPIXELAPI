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
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  const alloc = prep.data?.allocation || {};
  const { trainer_id: trainerId, zone_id: zoneId, map_id: mapId, level, species_id: speciesId } = alloc;

  console.log('alloc:', { trainerId: trainerId?.substring(0,8), mapId, zoneId: zoneId?.substring(0,8), level, speciesId });

  // Test N:speciesId format (old)
  const e1 = Array.from({length:20}, (_,i) => `${i+1}:${speciesId}`).join(',');
  const r1 = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(e1)}&level=${level}`, null, token);
  const alive1 = (r1.data?.data || []).filter(m => m.hp > 0);
  console.log(`\nFormat N:speciesId → status=${r1.status} | ${r1.data?.data?.length ?? 0} monsters | ${alive1.length} alive | respawn=${r1.data?.respawn_seconds}s`);

  // Test trainerId:zoneId:mapId:N format (new) with 300 slots
  const e2 = Array.from({length:300}, (_,i) => `${trainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const r2 = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(e2)}&level=${level}`, null, token);
  const alive2 = (r2.data?.data || []).filter(m => m.hp > 0);
  console.log(`Format trainerId:zone:map:N (300) → status=${r2.status} | ${r2.data?.data?.length ?? 0} monsters | ${alive2.length} alive | respawn=${r2.data?.respawn_seconds}s`);
  if (alive2.length > 0) console.log('Sample:', JSON.stringify(alive2[0]).substring(0, 200));
}
main().catch(e => console.error(e));
