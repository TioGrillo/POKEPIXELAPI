const https = require('https');

const CREDS   = { login: 'damdam5', password: 'Vd522431@' };
const ZONE_ID = '7843f17d-caee-4926-aad2-92012eaf4f04';
const INSTANCES   = 5;
const KILL_TARGET = 20; // kills per instance
const MAX_SLOT    = 45; // confirmed working from HAR

let token = '', alloc = null;
const globalStats = { requests: 0, errors: 0 };

// Shared slot queue — instances round-robin from slots 1..MAX_SLOT
let slotCursor = 0;
function getNextSlot() {
  const s = (slotCursor % MAX_SLOT) + 1;
  slotCursor++;
  return s;
}

async function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'pokepixel.nietore.com', port: 443,
      path: `/api/v1${path}`, method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    };
    const r = https.request(opts, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => { let p; try { p = JSON.parse(b); } catch { p = b; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function huntInstance(instanceId) {
  let kills = 0, attempts = 0;
  const times = [];

  while (kills < KILL_TARGET) {
    attempts++;
    const t0 = Date.now();
    const eventId = getNextSlot();

    const res = await req('POST', '/hunts/current/engage', {
      zone_id: alloc.zoneId, wild_monster_id: alloc.speciesId,
      map_id: alloc.mapId, event_id: eventId, level: alloc.level,
    });
    globalStats.requests++;
    const elapsed = Date.now() - t0;

    if (res.status === 200) {
      times.push(elapsed);
      kills++;
      if (kills % 5 === 0)
        console.log(`  [I${instanceId}] ${kills}/${KILL_TARGET} kills | slot=${eventId} | last=${elapsed}ms`);
    } else if (res.status === 404) {
      await new Promise(r => setTimeout(r, 500));
    } else if (res.status === 409) {
      // Slot busy — just grab next one immediately (no wait)
    } else {
      globalStats.errors++;
      if (res.status >= 500) await new Promise(r => setTimeout(r, 300));
    }
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { instanceId, kills, attempts, avg, min: Math.min(...times), max: Math.max(...times) };
}

async function main() {
  console.log('=== PokePixel 5-Instance Hunt Benchmark (Fixed Slots 1-45) ===\n');

  process.stdout.write('Logging in... ');
  const lr = await req('POST', '/auth/login', CREDS);
  token = lr.data.access_token;
  if (!token) { console.error('FAILED', lr.data); return; }
  console.log('OK');

  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' });
  await new Promise(r => setTimeout(r, 1000));

  process.stdout.write(`Preparing zone ${ZONE_ID.substring(0,8)}... `);
  const pr = await req('POST', '/hunts/prepare', { zone_id: ZONE_ID });
  if (pr.status !== 200 && pr.status !== 201) { console.error('FAILED', pr.status, pr.data); return; }
  const a = pr.data.allocation;
  alloc = { zoneId: a.zone_id, mapId: a.map_id, speciesId: a.species_id, level: a.level };
  console.log(`OK  (map=${alloc.mapId} species=${alloc.speciesId} level=${alloc.level})`);

  // Create hunt session
  process.stdout.write('Creating hunt... ');
  let cr = await req('POST', '/hunts/current/engage', { zone_id: alloc.zoneId, wild_monster_id: alloc.speciesId, map_id: alloc.mapId, event_id: 1, level: alloc.level });
  if (cr.status === 404) {
    cr = await req('POST', '/hunts', { zone_id: alloc.zoneId, wild_monster_id: alloc.speciesId, map_id: alloc.mapId, event_id: 1, level: alloc.level });
  }
  console.log(`${cr.status}`);
  await new Promise(r => setTimeout(r, 300));

  console.log(`\nStarting ${INSTANCES} parallel instances (${KILL_TARGET} kills each, slots 1-${MAX_SLOT})...\n`);
  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: INSTANCES }, (_, i) => huntInstance(i + 1)));
  const elapsed = (Date.now() - t0) / 1000;

  console.log('\n' + '='.repeat(55));
  console.log('RESULTS');
  console.log('='.repeat(55));
  for (const r of results)
    console.log(`  I${r.instanceId}: ${r.kills} kills / ${r.attempts} attempts | avg=${r.avg.toFixed(0)}ms | min=${r.min}ms | max=${r.max}ms`);

  const totalKills = results.reduce((s, r) => s + r.kills, 0);
  const grandAvg   = results.reduce((s, r) => s + r.avg, 0) / results.length;

  console.log('\n--- GLOBAL SUMMARY ---');
  console.log(`  Total kills   : ${totalKills}`);
  console.log(`  Wall time     : ${elapsed.toFixed(1)}s`);
  console.log(`  Kills/second  : ${(totalKills / elapsed).toFixed(2)} (all instances combined)`);
  console.log(`  Avg engage    : ${grandAvg.toFixed(0)}ms`);
  console.log(`  API requests  : ${globalStats.requests}`);
  console.log(`  Errors/retries: ${globalStats.errors}`);
}

main().catch(e => console.error('FATAL:', e));
