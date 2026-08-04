const GAME_URL = 'https://pokepixel.nietore.com/api/v1';
const MAIL_API = 'https://api.mail.tm';

function genRandom(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const POKEMONS_TO_TEST = [
  'bulbasaur',
  'charmander',
  'squirtle',
  'pikachu',
  'eevee',
  'chikorita',
  'cyndaquil',
  'totodile',
  'treecko',
  'torchic',
  'mudkip',
  'pidgey',
  'geodude',
  'abra',
  'gastly',
  'dratini',
  'mewtwo',
  'mew',
  'magikarp',
  'caterpie',
  'weedle',
  'rattata',
  'machop',
  'lucario',
  'gible'
];

async function createAndTestStarter(pokeName, threadId) {
  const logPrefix = `[Worker ${String(threadId).padStart(2, '0')}] [${pokeName.toUpperCase()}]`;
  console.log(`${logPrefix} Iniciando teste...`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 1. Domain mail.tm
      const domainRes = await fetch(`${MAIL_API}/domains`);
      if (!domainRes.ok) throw new Error(`Domain mail.tm status: ${domainRes.status}`);
      const domainData = await domainRes.json();
      const domain = domainData['hydra:member'][0].domain;

      const emailUser = genRandom(10);
      const emailAddress = `${emailUser}@${domain}`;
      const mailPassword = genRandom(12);
      const gamePassword = 'Senha@2025' + Math.floor(Math.random() * 100);
      const nick = 'T' + threadId + genRandom(4);

      // 2. Account mail.tm
      const mailRes = await fetch(`${MAIL_API}/accounts`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({address: emailAddress, password: mailPassword})
      });
      if (!mailRes.ok) {
        await sleep(2000);
        continue;
      }

      // 3. Token mail.tm
      const mailTokenRes = await fetch(`${MAIL_API}/token`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({address: emailAddress, password: mailPassword})
      });
      const {token: mailToken} = await mailTokenRes.json();

      // 4. Register PokePixel
      const regRes = await fetch(`${GAME_URL}/auth/register`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: nick, email: emailAddress, password: gamePassword, referral_code: ''})
      });
      const regText = await regRes.text();
      if (!regRes.ok) {
        if (regText.includes('RATE_LIMITED')) {
          console.log(`${logPrefix} Rate limited... aguardando 5s para tentar novamente.`);
          await sleep(5000);
          continue;
        }
        throw new Error(`Erro registro: ${regText}`);
      }

      // 5. Verify email
      let verifyToken = null;
      for (let i = 0; i < 12; i++) {
        await sleep(2000);
        const msgsRes = await fetch(`${MAIL_API}/messages`, {
          headers: {'Authorization': `Bearer ${mailToken}`}
        });
        const msgsData = await msgsRes.json();
        if (msgsData['hydra:member'] && msgsData['hydra:member'].length > 0) {
          const msgId = msgsData['hydra:member'][0].id;
          const msgDetailRes = await fetch(`${MAIL_API}/messages/${msgId}`, {
            headers: {'Authorization': `Bearer ${mailToken}`}
          });
          const msgDetail = await msgDetailRes.json();
          const body = msgDetail.text || msgDetail.html || '';
          const match = body.match(/token=([A-Za-z0-9_-]+)/);
          if (match && match[1]) {
            verifyToken = match[1];
            break;
          }
        }
      }

      if (!verifyToken) throw new Error('Timeout e-mail de verificação');

      await fetch(`${GAME_URL}/auth/email/verify`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token: verifyToken})
      });

      // 6. Login
      const loginRes = await fetch(`${GAME_URL}/auth/login`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({login: emailAddress, password: gamePassword})
      });
      const loginData = await loginRes.json();
      const token = loginData.access_token || loginData.token;

      // 7. POST /trainer with pokeName
      const trainerBody = {
        name: nick,
        gender: 'male',
        starter_species_id: pokeName,
        appearance: {
          actor_id: '1',
          character_name: '$TrainerMale01',
          character_index: '0',
          face_name: 'Actor1',
          face_index: '0'
        }
      };

      const trainerRes = await fetch(`${GAME_URL}/trainer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(trainerBody)
      });

      const status = trainerRes.status;
      const resText = await trainerRes.text();

      if (status === 200 || status === 201) {
        console.log(`\x1b[32m${logPrefix} ✅ SUCESSO! Aceitou ${pokeName.toUpperCase()} como starter!\x1b[0m`);
        return { poke: pokeName, status: 'SUCCESS', details: resText };
      } else {
        console.log(`\x1b[31m${logPrefix} ❌ RECUSADO (${status}): ${resText.trim()}\x1b[0m`);
        return { poke: pokeName, status: 'REJECTED', details: resText };
      }
    } catch (err) {
      if (attempt === 3) {
        console.log(`\x1b[33m${logPrefix} ⚠️ ERRO NO TESTE: ${err.message}\x1b[0m`);
        return { poke: pokeName, status: 'ERROR', details: err.message };
      }
      await sleep(3000);
    }
  }
}

async function runWorkerPool(poolSize = 2) {
  console.log(`====================================================`);
  console.log(` INICIANDO TESTE COM WORKER POOL (${poolSize} EM PARALELO)`);
  console.log(`====================================================\n`);

  const results = [];
  const queue = [...POKEMONS_TO_TEST];
  let idCounter = 1;

  async function worker() {
    while (queue.length > 0) {
      const poke = queue.shift();
      if (!poke) break;
      const workerId = idCounter++;
      const res = await createAndTestStarter(poke, workerId);
      results.push(res);
      await sleep(1500); // 1.5s delay between account creations to respect rate limits
    }
  }

  const workers = Array.from({ length: poolSize }, () => worker());
  await Promise.all(workers);

  console.log(`\n====================================================`);
  console.log(` RESUMO FINAL DO TESTE COM 25 POKÉMONS`);
  console.log(`====================================================`);
  
  const accepted = results.filter(r => r.status === 'SUCCESS');
  const rejected = results.filter(r => r.status === 'REJECTED');
  const errors = results.filter(r => r.status === 'ERROR');

  console.log(`\n✅ ACEITOS PELO SERVIDOR (${accepted.length}):`);
  accepted.forEach(a => console.log(`   - ${a.poke.toUpperCase()}`));

  console.log(`\n❌ RECUSADOS PELO SERVIDOR (${rejected.length}):`);
  rejected.forEach(r => console.log(`   - ${r.poke.toUpperCase()}`));

  if (errors.length > 0) {
    console.log(`\n⚠️ ERROS DE CONEXÃO/TIMEOUT (${errors.length}):`);
    errors.forEach(e => console.log(`   - ${e.poke.toUpperCase()}: ${e.details}`));
  }
}

runWorkerPool(2).catch(console.error);
