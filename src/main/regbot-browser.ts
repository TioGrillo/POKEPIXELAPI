/**
 * regbot-browser.ts
 *
 * Uses puppeteer-extra + stealth plugin instead of Electron BrowserWindow so
 * that Cloudflare Turnstile sees a real, undetectable Chrome browser.
 *
 * The Electron path is reused as the executablePath so no extra download is needed.
 */

import path from "node:path";
import fs from "node:fs";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer-core";
import { screen } from "electron";

puppeteerExtra.use(StealthPlugin());

const GAME_URL  = "https://pokepixel.nietore.com";
const REG_URL   = `${GAME_URL}/register`;
const LOGIN_URL = `${GAME_URL}/login`;

// Android Chrome UA
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 15; SM-A556E) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/148.0.7778.144 Mobile Safari/537.36";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ──────────────────────────────────────────────────────────────────────────────
// Nickname Generator (400+ names)
// ──────────────────────────────────────────────────────────────────────────────
const NAMES = [
  "Shadow", "Dark", "Light", "Knight", "Slayer", "Ninja", "Samurai", "Dragon", "Tiger", "Wolf",
  "Gabriel", "Thiago", "Lucas", "Mateus", "Rafael", "Bruno", "Felipe", "Rodrigo", "Carlos", "Eduardo",
  "Sniper", "Ghost", "Viper", "Cobra", "Eagle", "Falcon", "Hawk", "Raven", "Phoenix", "Titan",
  "Arthur", "Pedro", "João", "Guilherme", "Gustavo", "Leonardo", "Marcelo", "Ricardo", "Paulo", "Victor",
  "Hunter", "Ranger", "Striker", "Blade", "Sword", "Spear", "Shield", "Arrow", "Bow", "Magic",
  "Fernanda", "Juliana", "Camila", "Mariana", "Amanda", "Letícia", "Beatriz", "Larissa", "Natália", "Aline",
  "Wizard", "Mage", "Sorcerer", "Warlock", "Necromancer", "Paladin", "Cleric", "Druid", "Rogue", "Thief",
  "Assassin", "Mercenary", "Warrior", "Fighter", "Gladiator", "Champion", "Hero", "Legend", "Myth", "God",
  "Demon", "Devil", "Angel", "Spirit", "Soul", "Ghost", "Phantom", "Specter", "Wraith", "Reaper",
  "Death", "Life", "Blood", "Fire", "Water", "Earth", "Wind", "Ice", "Lightning", "Thunder",
  "Storm", "Rain", "Snow", "Frost", "Flame", "Blaze", "Inferno", "Lava", "Magma", "Ash",
  "Smoke", "Shadow", "Darkness", "Night", "Day", "Sun", "Moon", "Star", "Galaxy", "Universe",
  "Cosmos", "Space", "Time", "Dimension", "Portal", "Gate", "Door", "Key", "Lock", "Secret",
  "Mystery", "Enigma", "Puzzle", "Riddle", "Clue", "Hint", "Trace", "Track", "Path", "Road",
  "Way", "Journey", "Quest", "Adventure", "Mission", "Task", "Job", "Work", "Duty", "Honor",
  "Glory", "Fame", "Wealth", "Power", "Strength", "Might", "Force", "Energy", "Aura", "Ki",
  "Chi", "Chakra", "Mana", "Magic", "Spell", "Charm", "Hex", "Curse", "Blessing", "Miracle",
  "Wonder", "Marvel", "Phenomenon", "Anomaly", "Mutant", "Cyborg", "Robot", "Android", "Machine", "Mech",
  "Gear", "Cog", "Wheel", "Engine", "Motor", "Drive", "Core", "Heart", "Soul", "Mind",
  "Brain", "Intellect", "Wisdom", "Knowledge", "Truth", "Lie", "Deceit", "Illusion", "Trick", "Trap",
  "Bait", "Lure", "Snare", "Net", "Web", "Thread", "String", "Rope", "Chain", "Link",
  "Bond", "Tie", "Knot", "Tangle", "Mess", "Chaos", "Order", "Law", "Rule", "Code",
  "System", "Network", "Grid", "Matrix", "Cyber", "Tech", "Data", "Info", "Byte", "Bit",
  "Pixel", "Voxel", "Polygon", "Vector", "Line", "Curve", "Shape", "Form", "Figure", "Image",
  "Picture", "Photo", "Video", "Audio", "Sound", "Noise", "Music", "Song", "Tune", "Melody",
  "Rhythm", "Beat", "Tempo", "Pace", "Speed", "Velocity", "Acceleration", "Momentum", "Inertia", "Mass",
  "Weight", "Gravity", "Force", "Pressure", "Tension", "Stress", "Strain", "Load", "Burden", "Weight",
  "Gamer", "Player", "Pro", "Noob", "Elite", "Master", "Expert", "Veteran", "Rookie", "Newbie",
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa",
  "Enzo", "Valentina", "Miguel", "Alice", "Arthur", "Helena", "Gael", "Laura", "Heitor", "Maria",
  "Theo", "Sophia", "Davi", "Lorena", "Bernardo", "Livia", "Noah", "Giovanna", "Levi", "Isabella",
  "Samuel", "Luiza", "Diego", "Felipe", "Joaquim", "Cecilia", "Benicio", "Eloa", "Eduardo", "Melo",
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

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface RegJob {
  login: string;
  password: string;
  nick: string;
  trainerName: string;
}

export interface RegResult {
  login: string;
  nick: string;
  success: boolean;
  token: string;
  message: string;
}

export type ProgressCallback = (info: {
  current: number;
  total: number;
  nick: string;
  action: string;
  result?: RegResult;
}) => void;

// ──────────────────────────────────────────────────────────────────────────────
// Find Chrome/Edge installed on this Windows machine
// ──────────────────────────────────────────────────────────────────────────────
function findChromePath(): string {
  const localAppData = process.env.LOCALAPPDATA ?? "";
  const programFiles  = process.env.ProgramFiles  ?? "C:\\Program Files";
  const programFiles86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

  const candidates = [
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFiles86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.CHROME_PATH ?? "",
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error("Google Chrome ou Microsoft Edge n\u00e3o encontrado no sistema.");
}

// ──────────────────────────────────────────────────────────────────────────────
// Launch a stealth Chrome/Edge browser via puppeteer-extra
// ──────────────────────────────────────────────────────────────────────────────
async function launchBrowser(x: number, y: number): Promise<Browser> {
  const executablePath = findChromePath();

  const browser = await (puppeteerExtra as any).launch({
    headless: false,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=320,520",
      `--window-position=${Math.floor(x)},${Math.floor(y)}`,
      "--lang=pt-BR",
    ],
    defaultViewport: { width: 320, height: 420 },
    ignoreDefaultArgs: ["--enable-automation", "--enable-blink-features=IdleDetection"],
  });

  return browser as unknown as Browser;
}

// ──────────────────────────────────────────────────────────────────────────────
// React-aware form fill via puppeteer page
// ──────────────────────────────────────────────────────────────────────────────
async function fillRegistrationForm(
  page: Page,
  email: string,
  password: string,
  nick: string
) {
  await page.waitForSelector("input", { timeout: 12000 }).catch(() => {});
  
  await page.evaluate((e: string, n: string, p: string) => {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'
      )
    );

    function nset(el: HTMLInputElement, val: string) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      )?.set;
      setter?.call(el, val);
      ["input", "change"].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
      el.focus(); el.blur();
    }

    function attrs(el: HTMLInputElement) {
      return [
        el.name, el.id, el.placeholder, el.type,
        el.getAttribute("aria-label") || "",
        el.getAttribute("autocomplete") || "",
      ].map(s => (s || "").toLowerCase()).join(" ");
    }

    const emailEl  = inputs.find(el => /email|mail|login/.test(attrs(el)));
    const nickEl   = inputs.find(el =>
      !/email|senha|password|confirm/.test(attrs(el)) &&
      /username|nick|user|nome|apelido|personagem/.test(attrs(el))
    );
    const pwEls    = inputs.filter(el => el.type === "password");

    if (emailEl)  nset(emailEl, e);
    if (nickEl && nickEl !== emailEl) nset(nickEl, n);
    if (pwEls[0]) nset(pwEls[0], p);
    if (pwEls[1]) nset(pwEls[1], p);
  }, email, nick, password);
}

// ──────────────────────────────────────────────────────────────────────────────
// Dropmail helper — open in a separate page
// ──────────────────────────────────────────────────────────────────────────────
async function getDropmailEmail(dropPage: Page): Promise<{ email: string; restoreKey: string }> {
  await dropPage.goto("https://dropmail.me/en/", { waitUntil: "domcontentloaded", timeout: 20000 });

  let email = "";
  for (let i = 0; i < 25; i++) {
    email = await dropPage.evaluate(() => {
      const el = document.querySelector(".address");
      return el ? (el as HTMLElement).textContent?.trim() ?? "" : "";
    });
    if (email.includes("@")) break;
    await sleep(1000);
  }

  const restoreKey: string = await dropPage.evaluate(() => {
    try {
      const dump = (window as any).ko?.dataFor(document.body)?.restore?.accountsDump?.() ?? "";
      const parts = dump.split(":");
      return parts[1] ? parts[1].trim() : "";
    } catch { return ""; }
  });

  return { email, restoreKey };
}

async function waitForConfirmEmail(dropPage: Page, timeoutMs = 60000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const link: string = await dropPage.evaluate(() => {
      try {
        const msgs = (window as any).ko?.toJS?.((window as any).ko?.dataFor(document.body)?.messages) ?? [];
        if (msgs.length > 0) {
          const text = msgs[0].text || "";
          const m = text.match(/https:\/\/poke\.idleworld\.online\/verify-email\S+/);
          return m ? m[0] : "";
        }
      } catch { /* */ }
      return "";
    }).catch(() => "");
    if (link) return link.replace(/[>\])'"\s]+$/, "");
    await sleep(1000);
  }
  return "";
}

// ──────────────────────────────────────────────────────────────────────────────
// Main registration runner (Concurrent)
// ──────────────────────────────────────────────────────────────────────────────
export async function runBrowserRegistration(
  config: { count: number; password: string; prefix: string; usePrefix: boolean; avoidNumbers: boolean; starterId: number; gender: string },
  delayMs: number,
  onProgress: ProgressCallback,
  _mainWindowId?: number
): Promise<RegResult[]> {
  const results: RegResult[] = [];
  
  // Calculate window grid
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenW = primaryDisplay.workAreaSize.width;
  const screenH = primaryDisplay.workAreaSize.height;
  const winW = 320;
  const winH = 520;
  
  let currentX = 0;
  let currentY = 0;
  
  const tasks = Array.from({ length: config.count }).map(async (_, index) => {
    const x = currentX;
    const y = currentY;
    
    currentX += winW;
    if (currentX + winW > screenW) {
      currentX = 0;
      currentY += winH;
      if (currentY + winH > screenH) {
        currentY = 0; // wrap around
      }
    }

    let nick = generateNick(config.prefix, config.usePrefix, config.avoidNumbers);
    const password = config.password;
    const starterId = config.starterId || 7;
    const gender = config.gender === "random" ? (Math.random() > 0.5 ? "male" : "female") : config.gender;

    const push = (action: string, result?: RegResult) => {
      onProgress({ current: index + 1, total: config.count, nick, action, result });
    };

    let browser: Browser | null = null;
    let email = "";

    try {
      if (index > 0 && delayMs > 0) {
        await sleep(index * delayMs); // Stagger startups slightly
      }

      browser = await launchBrowser(x, y);

      const pages = await browser.pages();
      const gamePage: Page = pages[0] ?? await browser.newPage();
      const dropPage: Page = await browser.newPage();

      await gamePage.setUserAgent(ANDROID_UA);
      await dropPage.setUserAgent(ANDROID_UA);
      await gamePage.setExtraHTTPHeaders({
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua": '"Not/A)Brand";v="99", "Chromium";v="148"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
      });

      // ── Step 1: Get Dropmail email
      push("Carregando Dropmail.me...");
      const dropmailRes = await getDropmailEmail(dropPage);
      email = dropmailRes.email;
      const restoreKey = dropmailRes.restoreKey;

      if (!email) {
        const r: RegResult = { login: "", nick, success: false, token: "", message: "Falha ao gerar email." };
        results.push(r); push("ERRO: Falha ao gerar email.", r); return;
      }
      push(`Email gerado: ${email}`);

      // ── Step 2: Load registration page
      push("Abrindo página de registro...");
      await gamePage.goto(REG_URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
      await sleep(2000);

      const hasForm = await gamePage.evaluate(() => !!document.querySelector("input")).catch(() => false);
      if (!hasForm) {
        const r: RegResult = { login: email, nick, success: false, token: "", message: "Formulário não carregou." };
        results.push(r); push("ERRO: Formulário não encontrado.", r); return;
      }

      // ── Step 3: Fill form
      push("Preenchendo formulário...");
      await fillRegistrationForm(gamePage, email, password, nick);
      await sleep(800);

      // Accept ToS checkbox
      push("Aceitando Termos de Serviço...");
      try {
        await gamePage.evaluate(() => {
          const labels = Array.from(document.querySelectorAll("label"));
          const tosLabel = labels.find(l => l.textContent && (l.textContent.includes("18") || l.textContent.includes("Rules")));
          if (tosLabel) tosLabel.click();
          else {
            const cb = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
            if (cb) {
              const lbl = cb.closest("label");
              if (lbl) (lbl as HTMLElement).click();
              else cb.click();
            }
          }
        });
      } catch { /* ignored */ }
      await sleep(1000);

      // ── Step 4: Ação Manual do Turnstile
      push("Aguardando Cloudflare Turnstile (Ação Manual)...");
      let turnstileToken = "";
      
      // Infinite loop to wait for user to click
      const deadline = Date.now() + 10 * 60 * 1000; // 10 minutes max
      while (Date.now() < deadline) {
        turnstileToken = await gamePage.evaluate(() => {
          const el = document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
          return el ? el.value : "";
        }).catch(() => "");
        
        if (turnstileToken) break;
        
        // Check if the user already proceeded manually (no Turnstile token but login successful)
        const isLogged = await gamePage.evaluate(() => window.location.href.includes('/play') || window.location.href.includes('/game')).catch(() => false);
        if (isLogged) break;

        await sleep(1000);
      }

      if (!turnstileToken) {
        // If we still don't have it, maybe the user bypassed it or we timed out. Let's see if we got the JWT via localstorage
        const localJwt = await gamePage.evaluate(() => localStorage.getItem("auth-token")).catch(() => "");
        if (localJwt) {
          push("✓ Token encontrado via LocalStorage!");
          const r: RegResult = { login: email, nick, success: true, token: localJwt, message: "Conta registrada!" };
          (r as any).restoreKey = restoreKey;
          results.push(r); push(`✓ ${r.message}`, r); return;
        }

        const r: RegResult = { login: email, nick, success: false, token: "", message: "Turnstile timeout." };
        results.push(r); push("ERRO: Turnstile timeout.", r); return;
      }
      
      push("✓ Turnstile resolvido pelo usuário!");

      // ── Step 5: Clicar no botão CREATE ACCOUNT
      push("Clicando no botão de Criar Conta...");
      const responsePromise = gamePage.waitForResponse(response => 
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
        { timeout: 20000 }
      ).catch(() => null);

      await gamePage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find(b => {
          const t = b.textContent?.toLowerCase() || "";
          return t.includes("create account") || t.includes("registrar") || t.includes("cadastrar");
        }) || document.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (btn) btn.click();
      });

      let regToken = "";
      const regRes = await responsePromise;

      if (regRes && regRes.ok()) {
        push("Registro concluído com sucesso!");
        try {
          const json = await regRes.json();
          if (json.accessToken) regToken = json.accessToken;
        } catch { /* */ }
      } else if (regRes) {
        const errText = await regRes.text().catch(() => "");
        push(`Aviso no registro (${regRes.status()}): ${errText.slice(0, 80)}`);
      } else {
        push("Aviso: Nenhuma resposta da API de registro capturada (timeout).");
      }
      await sleep(1500);

      // Se ainda não tivermos token, tentamos pegar do localStorage
      if (!regToken) {
        regToken = await gamePage.evaluate(() => localStorage.getItem("auth-token") || "").catch(() => "");
      }

      // ── Step 6: Wait for confirmation email
      push("Aguardando email de confirmação...");
      const confirmLink = await waitForConfirmEmail(dropPage, 60000);
      if (confirmLink) {
        push("Email recebido! Verificando conta...");
        await gamePage.goto(confirmLink, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        await sleep(3000);
      } else {
        push("Aviso: Email de confirmação não chegou a tempo.");
      }

      // ── Step 7: Character creation
      const finalToken = regToken;
      if (finalToken) {
        push("Criando personagem...");
        
        const fallbackNicks = [nick];
        for (let i = 0; i < 9; i++) {
          fallbackNicks.push(generateNick(config.prefix, config.usePrefix, config.avoidNumbers));
        }

        const charOkNick = await gamePage.evaluate(
          async (token: string, nicks: string[], sid: number, g: string) => {
            for (const n of nicks) {
              try {
                const res = await fetch("https://pokepixel.nietore.com/api/characters", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ name: n, starterId: sid, gender: g }),
                });
                if (res.ok) return n;
                const text = await res.text().catch(() => "");
                if (text.includes("already") && text.includes("character")) return n; // Already has a character
                // Otherwise, it might be taken. Loop and try next nick.
              } catch { /* Network error, try next */ }
            }
            return null;
          },
          finalToken, fallbackNicks, starterId, gender
        );
        
        if (charOkNick) {
          push(`Personagem criado: ${charOkNick}!`);
          nick = charOkNick;
        } else {
          push("Falha ao criar personagem (nicks indisponíveis).");
        }
      }

      const result: RegResult = {
        login: email,
        nick,
        success: !!finalToken,
        token: finalToken || "",
        message: finalToken ? "Conta registrada com sucesso!" : "Registro sem token JWT.",
      };
      (result as any).restoreKey = restoreKey;
      results.push(result);
      push(result.success ? `✓ ${result.message}` : `✗ ${result.message}`, result);

    } catch (e: any) {
      const result: RegResult = { login: email || "", nick, success: false, token: "", message: `Erro fatal: ${e.message}` };
      results.push(result);
      push(`✗ ${result.message}`, result);
    } finally {
      if (browser) {
        try { await browser.close(); } catch { /* */ }
      }
    }
  });

  await Promise.all(tasks);
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Token Renewal (Login Only - Concurrent & Manual Turnstile)
// ──────────────────────────────────────────────────────────────────────────────
export async function runBrowserLoginOnly(
  jobs: RegJob[],
  delayMs: number,
  onProgress: ProgressCallback,
  _mainWindowId?: number
): Promise<RegResult[]> {
  const results: RegResult[] = [];
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenW = primaryDisplay.workAreaSize.width;
  const screenH = primaryDisplay.workAreaSize.height;
  const winW = 320;
  const winH = 520;
  
  let currentX = 0;
  let currentY = 0;

  const tasks = jobs.map(async (job, index) => {
    const x = currentX;
    const y = currentY;
    
    currentX += winW;
    if (currentX + winW > screenW) {
      currentX = 0;
      currentY += winH;
      if (currentY + winH > screenH) {
        currentY = 0;
      }
    }

    const push = (action: string, result?: RegResult) => {
      onProgress({ current: index + 1, total: jobs.length, nick: job.nick, action, result });
    };

    let browser: Browser | null = null;

    try {
      if (index > 0 && delayMs > 0) {
        await sleep(index * delayMs);
      }

      browser = await launchBrowser(x, y);
      const pages = await browser.pages();
      const page: Page = pages[0] ?? await browser.newPage();
      await page.setUserAgent(ANDROID_UA);
      await page.setExtraHTTPHeaders({
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      });

      push("Abrindo página de login...");
      await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
      await sleep(2000);

      await page.waitForSelector("input", { timeout: 12000 }).catch(() => {});

      push("Preenchendo login e senha...");
      await page.evaluate((em: string, pw: string) => {
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"));
        function nset(el: HTMLInputElement, val: string) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          setter?.call(el, val);
          ["input", "change"].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
        }
        const emailEl = inputs.find(el => /email|mail|login/.test([el.name, el.id, el.type, el.placeholder].join(" ").toLowerCase()));
        const pwEl    = inputs.find(el => el.type === "password");
        if (emailEl) nset(emailEl, em);
        if (pwEl)    nset(pwEl, pw);
      }, job.login, job.password);

      push("Aguardando Cloudflare Turnstile (Ação Manual)...");
      let token = "";
      let turnstileResponse = "";
      let loginClicked = false;
      
      page.on('response', async (response) => {
        if (response.url().includes('/api/auth/login') && response.request().method() === 'POST') {
          if (response.ok()) {
            try {
              const json = await response.json();
              if (json.accessToken) token = json.accessToken;
            } catch {}
          }
        }
      });
      
      const deadline = Date.now() + 10 * 60 * 1000; // 10 minutes max
      while (Date.now() < deadline) {
        if (token) break;
        token = await page.evaluate(() => localStorage.getItem("auth-token") || "").catch(() => "");
        if (token) break;
        
        const isLogged = await page.evaluate(() => window.location.href.includes('/play') || window.location.href.includes('/game')).catch(() => false);
        if (isLogged) {
          token = await page.evaluate(() => localStorage.getItem("auth-token") || "").catch(() => "");
          if (token) break;
        }

        const currentCf = await page.evaluate(() => {
          const el = document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
          return el ? el.value : "";
        }).catch(() => "");

        if (currentCf && currentCf !== turnstileResponse && !loginClicked) {
          turnstileResponse = currentCf;
          push("Turnstile resolvido. Clicando em entrar...");
          loginClicked = true;
          
          // Start waiting for the login API response
          const responsePromise = page.waitForResponse(response => 
            response.url().includes('/api/auth/login') && response.request().method() === 'POST',
            { timeout: 20000 }
          ).catch(() => null);

          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const btn = btns.find(b => {
              const t = b.textContent?.toLowerCase() || "";
              return t.includes("login") || t.includes("entrar");
            }) || document.querySelector<HTMLButtonElement>('button[type="submit"]');
            if (btn) btn.click();
          });
          
          const loginRes = await responsePromise;
          if (loginRes && loginRes.ok()) {
             try {
                const json = await loginRes.json();
                if (json.accessToken) token = json.accessToken;
             } catch {}
          }
          if (token) break;
        }

        // Just in case there is no turnstile or it wasn't required, try to click if we haven't yet and haven't seen a turnstile
        if (!loginClicked && !await page.evaluate(() => !!document.querySelector('.cf-turnstile')).catch(() => false)) {
            push("Nenhum desafio detectado, tentando logar direto...");
            loginClicked = true;
            
            const responsePromise = page.waitForResponse(response => 
              response.url().includes('/api/auth/login') && response.request().method() === 'POST',
              { timeout: 20000 }
            ).catch(() => null);

            await page.evaluate(() => {
              const btns = Array.from(document.querySelectorAll("button"));
              const btn = btns.find(b => {
                const t = b.textContent?.toLowerCase() || "";
                return t.includes("login") || t.includes("entrar");
              }) || document.querySelector<HTMLButtonElement>('button[type="submit"]');
              if (btn) btn.click();
            });
            
            const loginRes = await responsePromise;
            if (loginRes && loginRes.ok()) {
               try {
                  const json = await loginRes.json();
                  if (json.accessToken) token = json.accessToken;
               } catch {}
            }
            if (token) break;
        }

        await sleep(1000);
      }

      const result: RegResult = {
        login: job.login,
        nick: job.nick,
        success: !!token,
        token: token || "",
        message: token ? "Token atualizado com sucesso!" : `Login falhou ou timeout.`,
      };
      
      results.push(result);
      push(result.success ? `✓ ${result.message}` : `✗ ${result.message}`, result);

    } catch (e: any) {
      const result: RegResult = { login: job.login, nick: job.nick, success: false, token: "", message: `Erro fatal: ${e.message}` };
      results.push(result);
      push(`✗ ${result.message}`, result);
    } finally {
      if (browser) {
        try { await browser.close(); } catch { /* */ }
      }
    }
  });

  await Promise.all(tasks);
  return results;
}
