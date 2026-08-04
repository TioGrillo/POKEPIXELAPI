import { ipcMain } from "electron";
import { app } from "electron";
import { BrowserWindow } from "electron";

const GAME_URL = "https://pokepixel.nietore.com/api/v1";
const MAIL_API = "https://api.mail.tm";

export interface RegJob {
  login?: string; // only used for login, not register
  password?: string;
  nick: string;
  trainerName: string;
}

export interface RegResult {
  login: string;
  nick: string;
  success: boolean;
  token: string;
  message: string;
  password?: string;
}

const NAMES = [
  "Shadow", "Dark", "Light", "Knight", "Slayer", "Ninja", "Samurai", "Dragon", "Tiger", "Wolf",
  "Gabriel", "Thiago", "Lucas", "Mateus", "Rafael", "Bruno", "Felipe", "Rodrigo", "Carlos", "Eduardo",
  "Sniper", "Ghost", "Viper", "Cobra", "Eagle", "Falcon", "Hawk", "Raven", "Phoenix", "Titan",
  "Arthur", "Pedro", "Joao", "Guilherme", "Gustavo", "Leonardo", "Marcelo", "Ricardo", "Paulo", "Victor",
  "Hunter", "Ranger", "Striker", "Blade", "Sword", "Spear", "Shield", "Arrow", "Bow", "Magic",
  "Fernanda", "Juliana", "Camila", "Mariana", "Amanda", "Leticia", "Beatriz", "Larissa", "Natalia", "Aline",
  "Wizard", "Mage", "Sorcerer", "Warlock", "Necromancer", "Paladin", "Cleric", "Druid", "Rogue", "Thief",
  "Assassin", "Mercenary", "Warrior", "Fighter", "Gladiator", "Champion", "Hero", "Legend", "Myth", "God",
  "Demon", "Devil", "Angel", "Spirit", "Soul", "Phantom", "Specter", "Wraith", "Reaper",
  "Death", "Life", "Blood", "Fire", "Water", "Earth", "Wind", "Ice", "Lightning", "Thunder",
  "Storm", "Rain", "Snow", "Frost", "Flame", "Blaze", "Inferno", "Lava", "Magma", "Ash",
  "Smoke", "Darkness", "Night", "Day", "Sun", "Moon", "Star", "Galaxy", "Universe",
  "Cosmos", "Space", "Time", "Dimension", "Portal", "Gate", "Door", "Key", "Lock", "Secret",
  "Mystery", "Enigma", "Puzzle", "Riddle", "Clue", "Hint", "Trace", "Track", "Path", "Road",
  "Way", "Journey", "Quest", "Adventure", "Mission", "Task", "Job", "Work", "Duty", "Honor",
  "Glory", "Fame", "Wealth", "Power", "Strength", "Might", "Force", "Energy", "Aura", "Ki",
  "Chi", "Chakra", "Mana", "Charm", "Hex", "Curse", "Blessing", "Miracle",
  "Wonder", "Marvel", "Phenomenon", "Anomaly", "Mutant", "Cyborg", "Robot", "Android", "Machine", "Mech",
  "Gear", "Cog", "Wheel", "Engine", "Motor", "Drive", "Core", "Heart", "Mind",
  "Brain", "Intellect", "Wisdom", "Knowledge", "Truth", "Lie", "Deceit", "Illusion", "Trick", "Trap",
  "Bait", "Lure", "Snare", "Net", "Web", "Thread", "String", "Rope", "Chain", "Link",
  "Bond", "Tie", "Knot", "Tangle", "Mess", "Chaos", "Order", "Law", "Rule", "Code",
  "System", "Network", "Grid", "Matrix", "Cyber", "Tech", "Data", "Info", "Byte", "Bit",
  "Pixel", "Voxel", "Polygon", "Vector", "Line", "Curve", "Shape", "Form", "Figure", "Image",
  "Picture", "Photo", "Video", "Audio", "Sound", "Noise", "Music", "Song", "Tune", "Melody",
  "Rhythm", "Beat", "Tempo", "Pace", "Speed", "Velocity", "Acceleration", "Momentum", "Inertia", "Mass",
  "Weight", "Gravity", "Pressure", "Tension", "Stress", "Strain", "Load", "Burden",
  "Gamer", "Player", "Pro", "Noob", "Elite", "Master", "Expert", "Veteran", "Rookie", "Newbie",
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa",
  "Enzo", "Valentina", "Miguel", "Alice", "Helena", "Gael", "Laura", "Heitor", "Maria",
  "Theo", "Sophia", "Davi", "Lorena", "Bernardo", "Livia", "Noah", "Giovanna", "Levi", "Isabella",
  "Samuel", "Luiza", "Diego", "Joaquim", "Cecilia", "Benicio", "Eloa", "Melo",
  "Alves", "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Lima", "Gomes", "Costa",
  "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha",
  "Dias", "Pinto", "Mendes", "Nunes", "Machado", "Freitas", "Marques", "Tavares", "Moura", "Cardoso"
];

function generateNick(prefix: string, usePrefix: boolean, avoidNumbers: boolean): string {
  const n1 = NAMES[Math.floor(Math.random() * NAMES.length)];
  const n2 = NAMES[Math.floor(Math.random() * NAMES.length)];
  const num = Math.floor(10 + Math.random() * 89); // two random digits
  
  const base = (!avoidNumbers && Math.random() > 0.5) ? `${n1}${num}` : `${n1}${n2}`;
  
  if (usePrefix && prefix) {
    return `${prefix}${base}`;
  }
  return base;
}

// Generates random strings (used for emails)
function generateRandomString(length: number, avoidNumbers: boolean = false): string {
  const chars = avoidNumbers 
    ? "abcdefghijklmnopqrstuvwxyz" 
    : "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getMailDomain(): Promise<string> {
  const res = await fetch(`${MAIL_API}/domains`);
  const data = await res.json();
  if (data["hydra:member"] && data["hydra:member"].length > 0) {
    return data["hydra:member"][0].domain;
  }
  throw new Error("Não foi possível obter domínio do Mail.tm");
}

export async function runApiRegistration(
  config: any,
  delayMs: number,
  onProgress: (info: any) => void
): Promise<RegResult[]> {
  const results: RegResult[] = [];
  let domain = "";
  try {
    domain = await getMailDomain();
  } catch (e: any) {
    onProgress({ globalState: `Erro ao obter domínio de email: ${e.message}`, success: false });
    return [];
  }

  const numAccounts = config.numberAccounts || 1;

  for (let i = 0; i < numAccounts; i++) {
    const jobNum = i + 1;
    let nick = "";

    onProgress({
      jobIndex: i,
      jobLabel: `[${jobNum}/${numAccounts}]`,
      state: "Iniciando...",
    });

    try {
      const emailUser = generateRandomString(10).toLowerCase();
      const emailAddress = `${emailUser}@${domain}`;
      // Usar a senha definida pelo usuário (ou gerar uma segura)
      const password = config.password || config.genPassword || "Senha@2025";
      let nick = generateNick(config.prefix || "", !!config.useCustomPrefix, !!config.avoidNumbers);

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Criando email temporário...",
      });

      // 1. Create Mail.tm account
      const createMailRes = await fetch(`${MAIL_API}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: emailAddress, password })
      });
      if (!createMailRes.ok) throw new Error(`Erro ao criar email: ${await createMailRes.text()}`);

      // 2. Get Mail.tm token
      const mailTokenRes = await fetch(`${MAIL_API}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: emailAddress, password })
      });
      if (!mailTokenRes.ok) throw new Error("Erro ao obter token do email");
      const mailTokenData = await mailTokenRes.json();
      const mailToken = mailTokenData.token;

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Registrando no PokePixel...",
      });

      // 3. Register on PokePixel
      const registerRes = await fetch(`${GAME_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: nick, email: emailAddress, password, referral_code: "" })
      });
      if (!registerRes.ok) {
        const errorText = await registerRes.text();
        throw new Error(`Erro no registro do jogo: ${errorText}`);
      }

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Aguardando email de verificação...",
      });

      // 4. Poll Mail.tm for verification email
      let verifyToken = null;
      for (let attempts = 0; attempts < 20; attempts++) {
        await sleep(3000);
        const msgsRes = await fetch(`${MAIL_API}/messages`, {
          headers: { "Authorization": `Bearer ${mailToken}` }
        });
        const msgsData = await msgsRes.json();
        if (msgsData["hydra:member"] && msgsData["hydra:member"].length > 0) {
          const msgId = msgsData["hydra:member"][0].id;
          const msgDetailRes = await fetch(`${MAIL_API}/messages/${msgId}`, {
            headers: { "Authorization": `Bearer ${mailToken}` }
          });
          const msgDetail = await msgDetailRes.json();
          const body = msgDetail.text || msgDetail.html || "";
          
          // Token is usually in URL: ?token=HSdF0...
          const match = body.match(/token=([A-Za-z0-9_-]+)/);
          if (match && match[1]) {
            verifyToken = match[1];
            break;
          }
        }
      }

      if (!verifyToken) {
        throw new Error("Email de verificação não recebido ou token não encontrado");
      }

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Verificando conta...",
      });

      // 5. Verify email on PokePixel
      const verifyRes = await fetch(`${GAME_URL}/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken })
      });
      if (!verifyRes.ok) throw new Error(`Erro ao verificar email: ${await verifyRes.text()}`);

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Efetuando Login...",
      });

      // 6. Login no PokePixel — campo correto é 'login' (não 'email')
      const loginRes = await fetch(`${GAME_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: emailAddress, password })
      });
      if (!loginRes.ok) throw new Error(`Erro ao fazer login: ${await loginRes.text()}`);
      const loginData = await loginRes.json();
      // API retorna 'access_token' (não 'token')
      const gameToken = loginData.access_token || loginData.token || "";

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Criando Treinador...",
      });

      const isFemale = config.gender === "female";
      const appearance = isFemale ? {
        actor_id: "2",
        character_name: "$TrainerFemale01",
        character_index: "0",
        face_name: "Actor2",
        face_index: "0"
      } : {
        actor_id: "1",
        character_name: "$TrainerMale01",
        character_index: "0",
        face_name: "Actor1",
        face_index: "0"
      };

      const starter_species_id = config.starterId || "squirtle";

      // 7. Create Trainer
      await sleep(2000); // Aguarda sync no servidor
      const trainerRes = await fetch(`${GAME_URL}/trainer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${gameToken}`
        },
        body: JSON.stringify({
          name: nick,
          gender: config.gender || "male",
          appearance,
          starter_species_id
        })
      });
      if (!trainerRes.ok) {
        console.error(`Criar treinador falhou, mas conta foi gerada. Log: ${await trainerRes.text()}`);
      }

      const newAccount: RegResult = {
        login: emailAddress,
        nick,
        success: true,
        token: gameToken,
        message: "Registrado via API",
        password: password
      };
      results.push(newAccount);

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Finalizado com Sucesso!",
        isDone: true,
        result: newAccount
      });

    } catch (err: any) {
      const errorAccount: RegResult = {
        login: "",
        nick: nick || "",
        success: false,
        token: "",
        message: err.message
      };
      results.push(errorAccount);

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}]`,
        state: `Erro: ${err.message}`,
        isDone: true,
        result: errorAccount
      });
    }

    if (delayMs > 0 && i < numAccounts - 1) {
      onProgress({
        jobIndex: i,
        state: `Aguardando ${delayMs}ms...`
      });
      await sleep(delayMs);
    }
  }

  return results;
}

export async function runApiSingleGenerate(config: any = {}): Promise<RegResult> {
  const domain = await getMailDomain();
  const emailUser = generateRandomString(10).toLowerCase();
  const emailAddress = `${emailUser}@${domain}`;
  const password = "Senha@2025";
  const prefix = config.prefix || "Player";
  const usePrefix = config.usePrefix !== false;
  const avoidNum = config.avoidNum === true;
  const nick = generateNick(prefix, usePrefix, avoidNum);

  // 1. Create Mail.tm
  const mailRes = await fetch(`${MAIL_API}/accounts`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: emailAddress, password })
  });
  if (!mailRes.ok) throw new Error("Erro Mail.tm (criar)");

  // 2. Token Mail.tm
  const mailTokenRes = await fetch(`${MAIL_API}/token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: emailAddress, password })
  });
  if (!mailTokenRes.ok) throw new Error("Erro Mail.tm (token)");
  const mailToken = (await mailTokenRes.json()).token;

  // 3. Register PokePixel
  const registerRes = await fetch(`${GAME_URL}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: nick, email: emailAddress, password, referral_code: "" })
  });
  if (!registerRes.ok) throw new Error("Erro Registro: " + await registerRes.text());

  // 4. Poll Mail.tm
  let verifyToken = null;
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const msgsRes = await fetch(`${MAIL_API}/messages`, { headers: { "Authorization": `Bearer ${mailToken}` } });
    const msgsData = await msgsRes.json();
    if (msgsData["hydra:member"]?.length > 0) {
      const msgDetailRes = await fetch(`${MAIL_API}/messages/${msgsData["hydra:member"][0].id}`, { headers: { "Authorization": `Bearer ${mailToken}` } });
      const msgDetail = await msgDetailRes.json();
      const body = msgDetail.text || msgDetail.html || "";
      const match = body.match(/token=([A-Za-z0-9_-]+)/);
      if (match && match[1]) { verifyToken = match[1]; break; }
    }
  }
  if (!verifyToken) throw new Error("Token de verificação não encontrado.");

  // 5. Verify PokePixel
  const verifyRes = await fetch(`${GAME_URL}/auth/email/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: verifyToken })
  });
  if (!verifyRes.ok) throw new Error("Erro Verify: " + await verifyRes.text());

  // 6. Login
  const loginRes = await fetch(`${GAME_URL}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: emailAddress, password })
  });
  if (!loginRes.ok) throw new Error("Erro Login: " + await loginRes.text());
  const gameToken = (await loginRes.json()).access_token || "";

  // 7. Create Trainer
  const isFemale = config.gender === "female";
  const appearance = isFemale ? {
    actor_id: "2",
    character_name: "$TrainerFemale01",
    character_index: "0",
    face_name: "Actor2",
    face_index: "0"
  } : {
    actor_id: "1",
    character_name: "$TrainerMale01",
    character_index: "0",
    face_name: "Actor1",
    face_index: "0"
  };
  const starter_species_id = config.starterId || "squirtle";

  await sleep(2000); // Aguarda sync no servidor
  const trainerRes = await fetch(`${GAME_URL}/trainer`, {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${gameToken}` },
    body: JSON.stringify({ name: nick, gender: config.gender || "male", appearance, starter_species_id })
  });
  if (!trainerRes.ok) {
    console.error(`Erro ao criar treinador em runApiSingleGenerate: ${await trainerRes.text()}`);
  }

  return { login: emailAddress, nick, success: true, token: gameToken, message: "OK", password };
}

export async function runApiLoginOnly(
  jobs: RegJob[],
  delayMs: number,
  onProgress: (info: any) => void
): Promise<RegResult[]> {
  const results: RegResult[] = [];
  const numAccounts = jobs.length;

  for (let i = 0; i < numAccounts; i++) {
    const job = jobs[i];
    const jobNum = i + 1;
    const nick = job.nick || job.login || "";
    
    onProgress({
      jobIndex: i,
      jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
      state: "Fazendo login via API...",
    });

    try {
      const loginRes = await fetch(`${GAME_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: job.login, password: job.password })
      });
      
      if (!loginRes.ok) {
        throw new Error(`Erro HTTP ${loginRes.status}: ${await loginRes.text()}`);
      }
      
      const loginData = await loginRes.json();
      // API retorna 'access_token'
      const token = loginData.access_token || loginData.token || "";
      if (!token) throw new Error("Token não retornado pela API");

      results.push({
        login: job.login!,
        nick,
        success: true,
        token,
        message: ""
      });

      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: "Sucesso!",
        isDone: true
      });

    } catch (err: any) {
      onProgress({
        jobIndex: i,
        jobLabel: `[${jobNum}/${numAccounts}] [${nick}]`,
        state: `Erro: ${err.message}`,
        isDone: true
      });
      results.push({
        login: job.login || "",
        nick,
        success: false,
        token: "",
        message: err.message
      });
    }

    if (delayMs > 0 && i < numAccounts - 1) {
      onProgress({
        jobIndex: i,
        state: `Aguardando ${delayMs}ms...`
      });
      await sleep(delayMs);
    }
  }

  return results;
}
