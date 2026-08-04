// Teste direto do fluxo de registro no PokePixel
const GAME_URL = 'https://pokepixel.nietore.com/api/v1';
const MAIL_API = 'https://api.mail.tm';

function genRandom(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function testRegister() {
  // 1. Obter domínio do mail.tm
  const domainRes = await fetch(`${MAIL_API}/domains`);
  const domainData = await domainRes.json();
  const domain = domainData['hydra:member'][0].domain;
  console.log('Domínio email:', domain);

  const emailUser = genRandom(10);
  const emailAddress = `${emailUser}@${domain}`;
  const mailPassword = genRandom(12); // senha do mail.tm
  const gamePassword = 'Senha@2025';  // senha do jogo (da configuração)
  const nick = 'Player' + genRandom(4);
  
  console.log('Email:', emailAddress);
  console.log('Nick:', nick);
  console.log('Senha do jogo:', gamePassword);

  // 2. Criar conta mail.tm
  const mailRes = await fetch(`${MAIL_API}/accounts`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({address: emailAddress, password: mailPassword})
  });
  if (!mailRes.ok) { console.error('ERRO criar email:', await mailRes.text()); return; }
  console.log('✓ Email temporário criado');

  // 3. Obter token do mail.tm
  const mailTokenRes = await fetch(`${MAIL_API}/token`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({address: emailAddress, password: mailPassword})
  });
  if (!mailTokenRes.ok) { console.error('ERRO token email:', await mailTokenRes.text()); return; }
  const {token: mailToken} = await mailTokenRes.json();
  console.log('✓ Token email obtido');

  // 4. Registrar no PokePixel
  const regRes = await fetch(`${GAME_URL}/auth/register`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: nick, email: emailAddress, password: gamePassword, referral_code: ''})
  });
  const regBody = await regRes.text();
  if (!regRes.ok) { console.error('ERRO registro:', regBody); return; }
  console.log('✓ Registrado no PokePixel! Status:', regRes.status);

  // 5. Aguardar email de verificação
  console.log('Aguardando email de verificação...');
  let verifyToken = null;
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
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
        console.log('✓ Token de verificação encontrado!');
        break;
      }
    }
    console.log(`  Tentativa ${i+1}/20...`);
  }

  if (!verifyToken) { console.error('ERRO: email de verificação não chegou'); return; }

  // 6. Verificar email
  const verRes = await fetch(`${GAME_URL}/auth/email/verify`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({token: verifyToken})
  });
  if (!verRes.ok) { console.error('ERRO verificação:', await verRes.text()); return; }
  console.log('✓ Email verificado!');

  // 7. Login com campo 'login' (CORRIGIDO)
  const loginRes = await fetch(`${GAME_URL}/auth/login`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({login: emailAddress, password: gamePassword})
  });
  const loginBody = await loginRes.text();
  if (!loginRes.ok) { console.error('ERRO login:', loginBody); return; }
  const loginData = JSON.parse(loginBody);
  const token = loginData.access_token || loginData.token;
  if (!token) { console.error('ERRO: token não retornado', loginBody); return; }
  console.log('✓ Login realizado com sucesso!');
  console.log('\n==== CONTA CRIADA COM SUCESSO ====');
  console.log('Nick:', nick);
  console.log('Email:', emailAddress);
  console.log('Senha:', gamePassword);
  console.log('Token:', token.substring(0, 30) + '...');
}

testRegister().catch(console.error);
