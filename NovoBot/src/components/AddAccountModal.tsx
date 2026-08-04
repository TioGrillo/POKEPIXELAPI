import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogIn, UserPlus, CircleDashed, X, RefreshCw, AlertCircle, Sparkles, Sliders, Cpu, ShieldCheck } from 'lucide-react';
import type { Account } from '../types';
import { generateNick } from '../lib/nickGenerator';

interface AddAccountModalProps {
  onClose: () => void;
  onAdd: (account: Account) => void;
}

const GAME_URL = 'https://pokepixel.nietore.com/api/v1';
const MAIL_API = 'https://api.mail.tm';

function genRandomStr(n: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function netRequest(options: {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
  proxyUrl?: string | null;
}) {
  const electron = (window as any).electron;
  if (electron && typeof electron.invoke === 'function') {
    const res = await electron.invoke('net:request', options);
    return res;
  }

  // Fallback para Axios web direto
  const config: any = {
    url: options.url,
    method: options.method || 'GET',
    data: options.data,
    headers: options.headers || {},
    validateStatus: () => true,
  };
  const res = await axios(config);
  return { status: res.status, data: res.data, headers: res.headers };
}

export function AddAccountModal({ onClose, onAdd }: AddAccountModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // State: Login Manual
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // State: Gerador & Registro Automático
  const [usePrefix, setUsePrefix] = useState(true);
  const [prefixText, setPrefixText] = useState('PK');
  const [avoidNumbers, setAvoidNumbers] = useState(false);
  const [genderChoice, setGenderChoice] = useState<'male' | 'female' | 'random'>('random');
  const [starterChoice, setStarterChoice] = useState<'bulbasaur' | 'charmander' | 'squirtle' | 'random'>('random');
  const [accountCount, setAccountCount] = useState(1);
  const [threadsCount, setThreadsCount] = useState(5);
  const [defaultPassword, setDefaultPassword] = useState('Senha@2025');
  const [previewSeed, setPreviewSeed] = useState(0);

  // State: Proxies
  const [useProxy, setUseProxy] = useState(false);
  const [proxyListText, setProxyListText] = useState('');

  // State: Status do Processo de Registro
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerLogs, setRegisterLogs] = useState<string[]>([]);
  const [registerProgress, setRegisterProgress] = useState({ current: 0, total: 0 });

  // Preview de Nicks em tempo real reativo
  const [previewNicks, setPreviewNicks] = useState<string[]>([]);

  useEffect(() => {
    const list: string[] = [];
    for (let i = 0; i < 5; i++) {
      const g = genderChoice === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : genderChoice;
      list.push(generateNick(g, { usePrefix, prefix: prefixText, avoidNumbers }));
    }
    setPreviewNicks(list);
  }, [usePrefix, prefixText, avoidNumbers, genderChoice, previewSeed]);

  const refreshPreview = () => {
    setPreviewSeed((prev) => prev + 1);
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) return;
    setIsLoggingIn(true);
    setErrorMsg('');

    try {
      const res = await netRequest({
        url: `${GAME_URL}/auth/login`,
        method: 'POST',
        data: { login: loginEmail, password: loginPass }
      });

      if (res.status === 200 && res.data && (res.data.token || res.data.access_token)) {
        const tokenVal = res.data.token || res.data.access_token;
        const name = res.data.user?.name || loginEmail.split('@')[0];
        const accountId = res.data.user?.id || Date.now().toString();

        const newAcc: Account = {
          id: accountId,
          email: loginEmail,
          password: loginPass,
          token: tokenVal,
          name: name,
          status: 'idle',
          logs: [],
          mapId: '65183cd4-66f3-49a1-91a2-2c2eb9d614c7',
          captureConfig: { shiny: true, common: false, rare: false, epic: true, legendary: true, mythic: true },
          autoPotionThreshold: 50,
          autoHealEnabled: true,
          autoNurseJoyEnabled: true,
          autoSellLootKills: 0,
          autoSellPokemonConfig: { enabled: false, common: true, rare: false, epic: false },
          globalShinyMode: false,
          encounters: 0,
          captures: 0,
          shinies: 0,
          potionsUsed: 0,
          heroHp: 1,
          heroMaxHp: 1,
        };

        onAdd(newAcc);
        onClose();
      } else {
        setErrorMsg('Falha no login. Verifique as credenciais.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de rede ao logar: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const startAutoRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountCount <= 0 || !defaultPassword) return;

    setIsRegistering(true);
    setRegisterLogs([]);
    setRegisterProgress({ current: 0, total: accountCount });

    const log = (msg: string) => {
      setRegisterLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
    };

    // Prepara lista de proxies limpa
    const rawProxies = useProxy ? proxyListText.split('\n').map((p) => p.trim()).filter(Boolean) : [];
    const proxyCount = rawProxies.length;

    // Seleciona um proxy aleatório da lista para garantir rotação perfeita entre todas as requisições
    const getProxyForAttempt = (accIndex: number) => {
      if (!useProxy || proxyCount === 0) return null;
      const randomIndex = (accIndex + Math.floor(Math.random() * proxyCount)) % proxyCount;
      return rawProxies[randomIndex];
    };

    const totalToCreate = accountCount;
    const actualThreads = Math.min(Math.max(1, threadsCount), 25, totalToCreate);

    log(`🚀 Iniciando criação de ${totalToCreate} conta(s) em ${actualThreads} THREADS SIMULTÂNEAS...`);
    if (useProxy && proxyCount > 0) {
      log(`🛡️ Rotação de Proxy Node.js ATIVADA com ${proxyCount} proxy(ies) carregado(s).`);
    }

    let completedCount = 0;
    let createdSuccess = 0;

    // Fila de tarefas e mapa de re-tentativas de substituição
    const accountQueue = Array.from({ length: totalToCreate }, (_, idx) => idx + 1);
    const replacementRetryMap = new Map<number, number>();

    const runWorker = async (workerId: number) => {
      while (accountQueue.length > 0) {
        const accIndex = accountQueue.shift();
        if (!accIndex) break;

        const proxyUrl = getProxyForAttempt(accIndex);
        const proxyLogStr = proxyUrl ? ` [Proxy: ${proxyUrl.split('@').pop()}]` : '';

        const currentGender = genderChoice === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : genderChoice;
        const currentStarter =
          starterChoice === 'random'
            ? (['bulbasaur', 'charmander', 'squirtle'][Math.floor(Math.random() * 3)] as 'bulbasaur' | 'charmander' | 'squirtle')
            : starterChoice;

        let generatedNick = generateNick(currentGender, {
          usePrefix,
          prefix: prefixText,
          avoidNumbers,
        });

        log(`[Thread ${workerId} | Conta ${accIndex}/${totalToCreate}] Gerando nick: "${generatedNick}" (${currentGender})${proxyLogStr}...`);

        try {
          // 1. Mail.tm Domain
          const domainRes = await netRequest({ url: `${MAIL_API}/domains`, method: 'GET', proxyUrl });
          const domain = domainRes.data?.['hydra:member']?.[0]?.domain;
          if (!domain) throw new Error(`Não foi possível obter domínio Mail.tm (HTTP ${domainRes.status})`);

          const emailUser = genRandomStr(10);
          const emailAddress = `${emailUser}@${domain}`;
          const mailPassword = genRandomStr(12);

          // 2. Mail.tm Account
          const mailRes = await netRequest({
            url: `${MAIL_API}/accounts`,
            method: 'POST',
            data: { address: emailAddress, password: mailPassword },
            proxyUrl
          });
          if (mailRes.status !== 200 && mailRes.status !== 201) {
            if (mailRes.status === 429) {
              log(`⚠️ [Thread ${workerId}] Mail.tm Rate Limit (429)! Aguardando 5s...`);
              await sleep(5000);
            }
            throw new Error(`Falha Mail.tm Account: HTTP ${mailRes.status}`);
          }

          // 3. Mail.tm Token
          const mailTokenRes = await netRequest({
            url: `${MAIL_API}/token`,
            method: 'POST',
            data: { address: emailAddress, password: mailPassword },
            proxyUrl
          });
          const mailToken = mailTokenRes.data?.token;
          if (!mailToken) throw new Error('Token Mail.tm inválido');

          // 4. Register PokePixel com RE-TENTATIVAS SE O NICK JÁ EXISTIR (até +2 vezes)
          let currentNick = generatedNick;
          let registeredOk = false;

          for (let nickAttempt = 0; nickAttempt < 3; nickAttempt++) {
            if (nickAttempt > 0) {
              currentNick = generateNick(currentGender, { usePrefix, prefix: prefixText, avoidNumbers });
              log(`🔄 [Thread ${workerId}] Nick em uso. Tentando novo nick (${nickAttempt}/2): "${currentNick}"...`);
            }

            const regRes = await netRequest({
              url: `${GAME_URL}/auth/register`,
              method: 'POST',
              data: { username: currentNick, email: emailAddress, password: defaultPassword, referral_code: '' },
              proxyUrl
            });

            if (regRes.status === 200 || regRes.status === 201) {
              registeredOk = true;
              break;
            }

            const errorText = JSON.stringify(regRes.data || '');
            if (errorText.includes('RATE_LIMITED') || regRes.status === 429) {
              log(`⚠️ [Thread ${workerId}] Rate Limit no PokePixel! Aguardando 6s...`);
              await sleep(6000);
              accountQueue.unshift(accIndex); // Devolve para a fila tentar novamente
              return;
            }

            const isNickTaken = errorText.toLowerCase().includes('taken') || 
                                errorText.toLowerCase().includes('exist') || 
                                errorText.toLowerCase().includes('username') ||
                                errorText.toLowerCase().includes('name') ||
                                regRes.status === 400 || regRes.status === 409 || regRes.status === 422;

            if (!isNickTaken) {
              throw new Error(`Erro registrar PokePixel: HTTP ${regRes.status} - ${errorText}`);
            }
          }

          if (!registeredOk) {
            throw new Error(`Todas as 3 tentativas de nicks já estavam em uso.`);
          }

          log(`✓ [Thread ${workerId}] Registrado com nick "${currentNick}" (${emailAddress}). Aguardando e-mail...`);

          // 5. Espera e-mail de verificação
          let verifyToken: string | null = null;
          for (let attempt = 0; attempt < 15; attempt++) {
            await sleep(2000);
            const msgsRes = await netRequest({
              url: `${MAIL_API}/messages`,
              method: 'GET',
              headers: { Authorization: `Bearer ${mailToken}` },
              proxyUrl
            });
            const members = msgsRes.data?.['hydra:member'];
            if (members && members.length > 0) {
              const msgId = members[0].id;
              const msgDetailRes = await netRequest({
                url: `${MAIL_API}/messages/${msgId}`,
                method: 'GET',
                headers: { Authorization: `Bearer ${mailToken}` },
                proxyUrl
              });
              const body = msgDetailRes.data?.text || msgDetailRes.data?.html || '';
              const match = body.match(/token=([A-Za-z0-9_-]+)/);
              if (match && match[1]) {
                verifyToken = match[1];
                break;
              }
            }
          }

          if (!verifyToken) throw new Error('Timeout e-mail de verificação.');

          // 6. Confirma e-mail
          await netRequest({
            url: `${GAME_URL}/auth/email/verify`,
            method: 'POST',
            data: { token: verifyToken },
            proxyUrl
          });

          // 7. Login
          const loginRes = await netRequest({
            url: `${GAME_URL}/auth/login`,
            method: 'POST',
            data: { login: emailAddress, password: defaultPassword },
            proxyUrl
          });
          const tokenVal = loginRes.data?.access_token || loginRes.data?.token;

          if (!tokenVal) throw new Error('Token de login não retornado');

          // 8. Cria Personagem / Trainer com retry para CONNECTION_QUEUED
          const trainerBody = {
            name: currentNick,
            gender: currentGender,
            starter_species_id: currentStarter,
            appearance: currentGender === 'female'
              ? { actor_id: '2', character_name: '$TrainerFemale01', character_index: '0', face_name: 'Actor1', face_index: '1' }
              : { actor_id: '1', character_name: '$TrainerMale01', character_index: '0', face_name: 'Actor1', face_index: '0' },
          };

          let trainerOk = false;
          for (let trainerAttempt = 0; trainerAttempt < 20; trainerAttempt++) {
            const trainerRes = await netRequest({
              url: `${GAME_URL}/trainer`,
              method: 'POST',
              headers: { Authorization: `Bearer ${tokenVal}` },
              data: trainerBody,
              proxyUrl
            });

            if (trainerRes.status === 200 || trainerRes.status === 201) {
              trainerOk = true;
              break;
            }

            // Servidor colocou na fila — aguardar e retentar
            const isQueued = trainerRes.status === 429 ||
              trainerRes.data?.error?.code === 'CONNECTION_QUEUED' ||
              JSON.stringify(trainerRes.data).includes('CONNECTION_QUEUED');

            if (isQueued) {
              const queueData = trainerRes.data?.queue || {};
              const pollMs = queueData.poll_after_ms || 12000;
              const waitSec = queueData.estimated_wait_seconds || Math.ceil(pollMs / 1000);
              const pos = queueData.position || '?';
              log(`⏳ [Thread ${workerId}] Servidor em fila (pos ${pos}) para "${currentNick}". Aguardando ${waitSec}s...`);
              await sleep(pollMs + 2000); // +2s buffer
              continue;
            }

            // Qualquer outro erro — lança para o catch
            throw new Error(`Erro personagem: HTTP ${trainerRes.status} - ${JSON.stringify(trainerRes.data)}`);
          }

          if (!trainerOk) {
            throw new Error(`Timeout: servidor não admitiu personagem "${currentNick}" após 20 tentativas.`);
          }

          log(`✅ [Thread ${workerId}] Conta "${currentNick}" criada e inicializada com SUCESSO!`);

          const newAcc: Account = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            email: emailAddress,
            password: defaultPassword,
            token: tokenVal,
            name: currentNick,
            status: 'idle',
            logs: [],
            mapId: '65183cd4-66f3-49a1-91a2-2c2eb9d614c7',
            captureConfig: { shiny: true, common: false, rare: false, epic: true, legendary: true, mythic: true },
            autoPotionThreshold: 50,
            autoHealEnabled: true,
            autoNurseJoyEnabled: true,
            autoSellLootKills: 0,
            autoSellPokemonConfig: { enabled: false, common: true, rare: false, epic: false },
            globalShinyMode: false,
            encounters: 0,
            captures: 0,
            shinies: 0,
            potionsUsed: 0,
            heroHp: 1,
            heroMaxHp: 1,
          };

          onAdd(newAcc);
          createdSuccess++;
          completedCount++;
          setRegisterProgress({ current: completedCount, total: totalToCreate });
        } catch (err: any) {
          // MECANISMO DE SUBSTITUIÇÃO DA CONTA EM CASO DE FALHA (1 Re-tentativa de substituição)
          const retries = replacementRetryMap.get(accIndex) || 0;
          if (retries < 1) {
            replacementRetryMap.set(accIndex, retries + 1);
            log(`🔄 [Thread ${workerId}] Falha na conta ${accIndex} (${err.message}). Re-enfileirando para substituição automática (1/1)...`);
            accountQueue.push(accIndex); // Coloca a conta de volta na fila para ser substituída!
          } else {
            log(`❌ [Thread ${workerId}] Falha definitiva na conta ${accIndex} após substituição: ${err.message}`);
            completedCount++;
            setRegisterProgress({ current: completedCount, total: totalToCreate });
          }
        }
      }
    };

    // Dispara N workers paralelos
    const activeWorkers = Array.from({ length: actualThreads }, (_, idx) => runWorker(idx + 1));
    await Promise.all(activeWorkers);

    log(`🎉 Processo MULTITHREAD finalizado! ${createdSuccess} de ${totalToCreate} contas criadas com sucesso.`);
    setIsRegistering(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-[rgb(var(--bg-base))] rounded-2xl border border-[rgb(var(--border))] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-[rgb(var(--text-muted))] hover:text-white transition-colors z-10">
          <X size={20} />
        </button>

        {/* Abas */}
        <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] px-6 pt-4 gap-4">
          <button
            onClick={() => setActiveTab('login')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'
            }`}
          >
            <LogIn size={16} />
            Login Manual
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'
            }`}
          >
            <UserPlus size={16} />
            Criar Novas Contas
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'login' ? (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LogIn size={18} className="text-blue-400" />
                Login de Conta Existente
              </h2>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={doLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">Email / Login</label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">Senha</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn || !loginEmail || !loginPass}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {isLoggingIn ? <CircleDashed size={18} className="animate-spin" /> : <LogIn size={18} />}
                  Entrar na Conta
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={startAutoRegistration} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-green-400" />
                  Gerador & Registro Automático
                </h2>
              </div>

              {/* Opções do Gerador de Nick */}
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Sliders size={14} /> Configurações de Nick</span>
                  <button type="button" onClick={refreshPreview} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 normal-case text-[11px]">
                    <RefreshCw size={12} /> Gerar Novos Nicks
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Option: Ativar / Desativar Prefixo */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white bg-[rgb(var(--bg-deep))] p-2.5 rounded-lg border border-[rgb(var(--border))]">
                    <input
                      type="checkbox"
                      checked={usePrefix}
                      onChange={(e) => setUsePrefix(e.target.checked)}
                      className="accent-green-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Ativar Prefixo</span>
                  </label>

                  {/* Input do Prefixo */}
                  {usePrefix && (
                    <input
                      type="text"
                      maxLength={6}
                      value={prefixText}
                      onChange={(e) => setPrefixText(e.target.value)}
                      placeholder="Prefixo (ex: PK)"
                      className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-green-500 font-mono"
                    />
                  )}

                  {/* Option: Evitar Números no Nick */}
                  <label className={`flex items-center gap-2 cursor-pointer text-xs text-white bg-[rgb(var(--bg-deep))] p-2.5 rounded-lg border border-[rgb(var(--border))] ${usePrefix ? 'col-span-2' : 'col-span-1'}`}>
                    <input
                      type="checkbox"
                      checked={avoidNumbers}
                      onChange={(e) => setAvoidNumbers(e.target.checked)}
                      className="accent-green-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Evitar Números no Nick</span>
                  </label>
                </div>

                {/* Preview dos Nicks Gerados */}
                <div className="mt-2 pt-2 border-t border-[rgb(var(--border))]/50">
                  <span className="text-[10px] text-[rgb(var(--text-muted))] uppercase font-bold block mb-1">Exemplo de Nicks Gerados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {previewNicks.map((nk, idx) => (
                      <span key={idx} className="bg-green-500/10 text-green-400 border border-green-500/30 text-[11px] font-mono px-2 py-0.5 rounded">
                        {nk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sexo e Pokémon Inicial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">Sexo do Treinador</label>
                  <select
                    value={genderChoice}
                    onChange={(e) => setGenderChoice(e.target.value as any)}
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                  >
                    <option value="random">🎲 Aleatório</option>
                    <option value="male">👦 Masculino</option>
                    <option value="female">👧 Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">Pokémon Inicial</label>
                  <select
                    value={starterChoice}
                    onChange={(e) => setStarterChoice(e.target.value as any)}
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                  >
                    <option value="random">🎲 Aleatório</option>
                    <option value="bulbasaur">🌿 Bulbasaur</option>
                    <option value="charmander">🔥 Charmander</option>
                    <option value="squirtle">💧 Squirtle</option>
                  </select>
                </div>
              </div>

              {/* Concorrência & Performance (Contas, Threads e Senha) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">Qtd Contas</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={accountCount}
                    onChange={(e) => setAccountCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-400 uppercase mb-1 flex items-center gap-1">
                    <Cpu size={12} /> Threads (1-25)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={threadsCount}
                    onChange={(e) => setThreadsCount(Math.min(25, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-[rgb(var(--bg-surface))] border border-blue-500/50 rounded-lg px-3 py-2 text-xs text-blue-400 font-bold outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">Senha Padrão</label>
                  <input
                    type="text"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500 font-mono"
                  />
                </div>
              </div>

              {/* Configurações de Proxy */}
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-3.5 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                  <input
                    type="checkbox"
                    checked={useProxy}
                    onChange={(e) => setUseProxy(e.target.checked)}
                    className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="font-bold flex items-center gap-1.5 text-blue-400">
                    <ShieldCheck size={14} /> Usar Lista de Proxies (Mail.tm + PokePixel)
                  </span>
                </label>

                {useProxy && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-[rgb(var(--text-muted))] block">
                      Cole uma lista de proxies (1 por linha). Suporta formatos <code className="text-white">host:port:user:pass</code>, <code className="text-white">user:pass@host:port</code> ou <code className="text-white">host:port</code>:
                    </span>
                    <textarea
                      rows={4}
                      value={proxyListText}
                      onChange={(e) => setProxyListText(e.target.value)}
                      placeholder={`brd.superproxy.io:44445:brd-customer-hl_1727472a-zone-datacenter_proxy1-ip-45.144.88.230:juloidq9uod2\n185.220.101.4:8080\nhttp://user:pass@192.168.1.1:3128`}
                      className="w-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-blue-500 custom-scrollbar resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Logs do Registro Automático */}
              {registerLogs.length > 0 && (
                <div className="bg-black/40 border border-[rgb(var(--border))] rounded-xl p-3 space-y-1 text-[11px] font-mono max-h-36 overflow-y-auto custom-scrollbar">
                  <div className="text-green-400 font-bold mb-1 flex items-center justify-between">
                    <span>Progresso: {registerProgress.current} / {registerProgress.total}</span>
                    <span className="text-blue-400">{threadsCount} Threads Ativas</span>
                  </div>
                  {registerLogs.map((l, idx) => (
                    <div key={idx} className={l.includes('✅') ? 'text-green-400 font-bold' : l.includes('❌') ? 'text-red-400' : 'text-gray-300'}>
                      {l}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isRegistering || accountCount <= 0 || !defaultPassword}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isRegistering ? <CircleDashed size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {isRegistering ? `Criando Contas (${registerProgress.current}/${registerProgress.total})...` : `Criar ${accountCount} Conta(s) [${threadsCount} Threads]`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
