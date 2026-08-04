const https = require('https');
async function req(m, p, b, t) {
  return new Promise((resolve, reject) => {
    const data = b ? JSON.stringify(b) : null;
    const opts = { hostname: 'pokepixel.nietore.com', port: 443, path: `/api/v1${p}`, method: m.toUpperCase(), headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(t ? { 'Authorization': `Bearer ${t}` } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const r = https.request(opts, (res) => { let b = ''; res.on('data', d => b += d); res.on('end', () => { let p; try { p = JSON.parse(b); } catch(e) { p = b; } resolve({ status: res.statusCode, data: p }); }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const ts = () => new Date().toLocaleTimeString('pt-BR', { hour12: false });

async function login() {
  const l = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  return l.data.access_token;
}

async function getAlive(token, alloc) {
  for (const c of [5, 10, 20, 32]) {
    const ev = Array.from({length: c}, (_, i) => `${i+1}:${alloc.species_id}`).join(',');
    const w = await req('GET', `/wild-monsters?zone_id=${alloc.zone_id}&map_id=${alloc.map_id}&events=${encodeURIComponent(ev)}&level=${alloc.level}`, null, token);
    if (w.status === 200) return (w.data?.data || []).filter(m => m.hp > 0);
  }
  return [];
}

async function main() {
  let token = await login();
  if (!token) { console.log('Login failed'); return; }

  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  const alloc = prep.data?.allocation;
  console.log(`[${ts()}] Zone: ${alloc?.species_id} level:${alloc?.level} map_id:${alloc?.map_id}`);

  let serverKills = 0, totalEngages = 0;
  const startTime = Date.now();

  // Simulate 5 instances for 30 seconds
  const instances = [0, 1, 2, 3, 4];
  const engagedEvents = new Set();
  let alive = [];
  let aliveTs = 0;

  async function instanceLoop(id) {
    const now = Date.now();
    if (now - startTime > 30000) return; // Run for 30s

    // Refresh alive list every 1.5s (shared via closure)
    if (id === 0 && now - aliveTs > 1500) {
      alive = await getAlive(token, alloc);
      aliveTs = Date.now();
      if (alive.length === 0) {
        console.log(`[${ts()}] Inst${id}: sem monstros (respawn), aguardando 3s...`);
        setTimeout(() => instanceLoop(id), 3000);
        return;
      }
    } else if (id !== 0 && now - aliveTs > 1500) {
      setTimeout(() => instanceLoop(id), 200); // Wait for inst0 to refresh
      return;
    }

    const target = alive.find(t => !engagedEvents.has(t.event_id));
    if (!target) {
      setTimeout(() => instanceLoop(id), 300);
      return;
    }

    engagedEvents.add(target.event_id);
    const t0 = Date.now();
    const payload = { zone_id: alloc.zone_id, wild_monster_id: target.species_id, map_id: alloc.map_id, event_id: target.event_id, level: target.level };
    let e = await req('POST', '/hunts/current/engage', payload, token);
    if (e.status === 404) {
      await req('POST', '/hunts', payload, token);
      e = await req('POST', '/hunts/current/engage', payload, token);
    }
    if (e.status === 401) {
      token = await login();
      engagedEvents.delete(target.event_id);
      setTimeout(() => instanceLoop(id), 500);
      return;
    }

    const latency = Date.now() - t0;
    const s = e.data?.summary;
    const kills = s?.kills || 0;
    const nextActionAt = e.data?.next_action_at;
    const nextMs = nextActionAt ? Math.max(0, new Date(nextActionAt).getTime() - Date.now()) : 0;
    totalEngages++;

    if (kills > serverKills) {
      const diff = kills - serverKills;
      const exp = s?.exp_gained || 0;
      serverKills = kills;
      console.log(`[${ts()}] Inst${id}: KILL +${diff} | Total:${kills} | exp:${exp} | latency:${latency}ms | next_action_in:${nextMs}ms`);
    } else {
      console.log(`[${ts()}] Inst${id}: engage HTTP${e.status} | kills:${kills} | latency:${latency}ms | next_action_in:${nextMs}ms`);
    }

    // Remove from engaged after 1.5s, remove from alive cache
    setTimeout(() => {
      engagedEvents.delete(target.event_id);
      alive = alive.filter(m => m.event_id !== target.event_id);
    }, 1500);

    const delay = Math.min(nextMs + 50, 2000);
    setTimeout(() => instanceLoop(id), delay);
  }

  // Start all instances staggered
  instances.forEach((id, i) => setTimeout(() => instanceLoop(id), i * 300));

  // Print summary after 32s
  setTimeout(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`\n[${ts()}] === RESUMO ===`);
    console.log(`Duração: ${elapsed.toFixed(1)}s | Total engages: ${totalEngages} | Kills confirmados: ${serverKills}`);
    console.log(`Taxa de engage: ${(totalEngages/elapsed).toFixed(1)}/s | Taxa de kills: ${(serverKills/elapsed*60).toFixed(1)}/min`);
  }, 32000);
}

main().catch(console.error);
