const GAME_URL = 'https://pokepixel.nietore.com/api/v1';
const MAIL_API = 'https://api.mail.tm';

function genRandom(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function testCustomStarter(targetStarter = 'pikachu') {
  console.log(`\n========================================`);
  console.log(` TESTANDO STARTER CUSTOMIZADO: ${targetStarter.toUpperCase()}`);
  console.log(`========================================\n`);

  // 1. Domain mail.tm
  const domainRes = await fetch(`${MAIL_API}/domains`);
  const domainData = await domainRes.json();
  const domain = domainData['hydra:member'][0].domain;

  const emailUser = genRandom(10);
  const emailAddress = `${emailUser}@${domain}`;
  const mailPassword = genRandom(12);
  const gamePassword = 'Senha@2025' + Math.floor(Math.random() * 100);
  const nick = 'Test' + genRandom(5);

  console.log('Email:', emailAddress);
  console.log('Nick:', nick);

  // 2. Account mail.tm
  const mailRes = await fetch(`${MAIL_API}/accounts`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({address: emailAddress, password: mailPassword})
  });
  if (!mailRes.ok) { console.error('ERRO criar email:', await mailRes.text()); return; }

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
  if (!regRes.ok) { console.error('ERRO registro:', await regRes.text()); return; }
  console.log('✓ Registrado!');

  // 5. Verify email
  let verifyToken = null;
  for (let i = 0; i < 20; i++) {
    await sleep(2500);
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

  if (!verifyToken) { console.error('ERRO: Token de e-mail não chegou'); return; }

  const verRes = await fetch(`${GAME_URL}/auth/email/verify`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({token: verifyToken})
  });
  console.log('✓ E-mail verificado!');

  // 6. Login
  const loginRes = await fetch(`${GAME_URL}/auth/login`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({login: emailAddress, password: gamePassword})
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  console.log('✓ Login OK!');

  // 7. Test POST /trainer with custom starter
  console.log(`\nEnviando requisição POST /api/v1/trainer com starter_species_id="${targetStarter}"...`);
  
  const trainerBody = {
    name: nick,
    gender: 'male',
    starter_species_id: targetStarter,
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

  console.log(`\nSTATUS RESPOSTA: ${status}`);
  console.log(`CORPO RESPOSTA:\n${resText}\n`);

  if (status === 200 || status === 201) {
    console.log(`🎉 SUCESSO EXPLOIT! O jogo aceitou ${targetStarter} como Pokémon Inicial!`);
    
    // Check creatures to confirm
    const cRes = await fetch(`${GAME_URL}/creatures?location=team`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('TIME OBTIDO:', await cRes.text());
  } else {
    console.log(`❌ FALHOU / RECUSADO: O servidor bloqueou ${targetStarter}.`);
  }
}

// Rodar teste com pikachu
testCustomStarter('pikachu').catch(console.error);
