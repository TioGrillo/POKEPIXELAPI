import { useState, useEffect } from "react";
import type { AccountConfig } from "../../types";
import { createDefaultAccount } from "../../types";
import { HuntSelector } from "./HuntSelector";
import { loadJSON } from "../../lib/dataLoader";
import { invoke } from "../../lib/ipc";
import { X, ChevronRight, LogIn, Key, Loader2, CheckCircle2, AlertCircle, UserPlus } from "lucide-react";

interface AddAccountDialogProps {
  onAdd: (account: AccountConfig) => void;
  onClose: () => void;
}

type Mode = "login" | "generate" | "token";

export function AddAccountDialog({ onAdd, onClose }: AddAccountDialogProps) {
  const [mode, setMode] = useState<Mode>("login");

  // Login mode fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Token mode fields
  const [name, setName] = useState("");
  const [token, setToken] = useState("");

  // Generate mode fields
  const [gender, setGender] = useState<"male" | "female">(localStorage.getItem("rb_gender") as "male" | "female" || "male");
  const [starterId, setStarterId] = useState(localStorage.getItem("rb_starter") || "squirtle");

  // Shared
  const [hunt, setHunt] = useState("hunt_pidgey");
  const [showHuntSelector, setShowHuntSelector] = useState(false);
  const [huntsData, setHuntsData] = useState<any[]>([]);

  useEffect(() => {
    loadJSON<{ hunts: any[] }>("hunts_data.json").then((d) => setHuntsData(d.hunts || []));
  }, []);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoginLoading(true);
    setLoginStatus(null);
    try {
      const res = await invoke<{ success: boolean; token: string; message?: string }>(
        "regbot:login",
        { login: email.trim(), password: password.trim() }
      );
      if (res?.success && res.token) {
        setLoginStatus({ ok: true, msg: "Login realizado! Adicionando conta..." });
        const nick = email.split("@")[0];
        const acc = createDefaultAccount(nick, res.token, hunt);
        (acc as any).email = email.trim();
        (acc as any).password = password.trim();
        setTimeout(() => onAdd(acc), 500);
      } else {
        setLoginStatus({ ok: false, msg: res?.message || "Falha no login. Verifique email e senha." });
      }
    } catch (err: any) {
      setLoginStatus({ ok: false, msg: err.message || "Erro de conexão." });
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleGenerateSubmit() {
    setLoginLoading(true);
    setLoginStatus(null);
    try {
      const prefix = localStorage.getItem("rb_prefix") || "Player";
      const usePrefix = localStorage.getItem("rb_usePrefix") !== "false";
      const avoidNum = localStorage.getItem("rb_avoidNum") === "true";

      const res = await invoke<{ success: boolean; result: any; message?: string }>("regbot:generate-one", { 
        gender, 
        starterId,
        prefix,
        usePrefix,
        avoidNum
      });
      if (res?.success && res.result?.token) {
        setLoginStatus({ ok: true, msg: `Conta ${res.result.nick} gerada! Adicionando...` });
        const acc = createDefaultAccount(res.result.nick, res.result.token, hunt);
        (acc as any).email = res.result.login;
        (acc as any).password = res.result.password;
        setTimeout(() => onAdd(acc), 1000);
      } else {
        setLoginStatus({ ok: false, msg: res?.message || "Falha ao gerar conta." });
      }
    } catch (err: any) {
      setLoginStatus({ ok: false, msg: err.message || "Erro de conexão." });
    } finally {
      setLoginLoading(false);
    }
  }

  function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !token.trim()) return;
    const acc = createDefaultAccount(name.trim(), token.trim(), hunt);
    onAdd(acc);
  }

  const currentHunt = huntsData.find(h => h.id === hunt);
  const currentHuntName = currentHunt?.name || hunt;
  const pokemonSlug = (currentHunt?.id || hunt).replace(/^hunt_/, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[500px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">Adicionar Conta — PokePixel</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"><X size={14} /></button>
        </div>

        <div className="flex gap-1 px-5 pt-4">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 transition-all ${mode === "login" ? "bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/40" : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))]"}`}>
            <LogIn size={13} /> Login
          </button>
          <button onClick={() => setMode("generate")} className={`flex-1 py-2 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 transition-all ${mode === "generate" ? "bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/40" : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))]"}`}>
            <UserPlus size={13} /> Gerar
          </button>
          <button onClick={() => setMode("token")} className={`flex-1 py-2 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 transition-all ${mode === "token" ? "bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/40" : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))]"}`}>
            <Key size={13} /> Token
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-[11px] text-blue-400">
                O bot vai fazer login automaticamente e salvar o token. Use o email ou username cadastrado no PokePixel.
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Email ou Username</label>
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: seuemail@mail.tm ou seunick" autoFocus className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha da conta" className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Hunt Inicial</label>
                <div onClick={() => setShowHuntSelector(true)} className="flex items-center gap-3 w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <img src={`https://pokepixel.nietore.com/assets/imported/creatures/${pokemonSlug}/front.png`} alt={currentHuntName} className="w-12 h-12 object-contain object-bottom" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb='1'; t.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png`; } }} />
                  <div className="flex-1">
                    <div className="text-[13px] text-[rgb(var(--text-primary))] capitalize">{currentHuntName}</div>
                    <div className="text-[11px] text-[rgb(var(--text-muted))]">Clique para selecionar hunt</div>
                  </div>
                  <ChevronRight size={14} className="text-[rgb(var(--text-faint))]" />
                </div>
              </div>
              {loginStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${loginStatus.ok ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                  {loginStatus.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {loginStatus.msg}
                </div>
              )}
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] transition-colors">Cancelar</button>
                <button type="submit" disabled={!email.trim() || !password.trim() || loginLoading} className="px-5 py-1.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                  {loginLoading && <Loader2 size={13} className="animate-spin" />}
                  {loginLoading ? "Fazendo Login..." : "Entrar e Adicionar"}
                </button>
              </div>
            </form>
          )}

          {mode === "generate" && (
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-[11px] text-purple-400">
                Gere uma conta no PokePixel automaticamente. Ela será registrada, verificada e adicionada à lista.
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Hunt Inicial</label>
                <div onClick={() => setShowHuntSelector(true)} className="flex items-center gap-3 w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <img src={`https://pokepixel.nietore.com/assets/imported/creatures/${pokemonSlug}/front.png`} alt={currentHuntName} className="w-12 h-12 object-contain object-bottom" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb='1'; t.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png`; } }} />
                  <div className="flex-1">
                    <div className="text-[13px] text-[rgb(var(--text-primary))] capitalize">{currentHuntName}</div>
                    <div className="text-[11px] text-[rgb(var(--text-muted))]">Clique para selecionar hunt</div>
                  </div>
                  <ChevronRight size={14} className="text-[rgb(var(--text-faint))]" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Sexo do Treinador</label>
                  <select
                    value={gender}
                    onChange={(e) => { setGender(e.target.value as "male" | "female"); localStorage.setItem("rb_gender", e.target.value); }}
                    className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Pokémon Inicial</label>
                  <select
                    value={starterId}
                    onChange={(e) => { setStarterId(e.target.value); localStorage.setItem("rb_starter", e.target.value); }}
                    className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  >
                    <option value="bulbasaur">Bulbasaur</option>
                    <option value="charmander">Charmander</option>
                    <option value="squirtle">Squirtle</option>
                    <option value="pikachu">Pikachu</option>
                    <option value="eevee">Eevee</option>
                  </select>
                </div>
              </div>
              {loginStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${loginStatus.ok ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                  {loginStatus.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {loginStatus.msg}
                </div>
              )}
              <div className="flex flex-col items-center justify-center gap-4 py-2">
                <button type="button" onClick={handleGenerateSubmit} disabled={loginLoading} className="w-full px-5 py-2.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                  {loginLoading && <Loader2 size={13} className="animate-spin" />}
                  {loginLoading ? "Gerando e Registrando (Pode demorar uns segundos)..." : "Gerar Nova Conta e Adicionar"}
                </button>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {mode === "token" && (
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-[11px] text-yellow-400">
                Cole o token JWT diretamente. Tokens expiram, você precisará renovar periodicamente.
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Nome da Conta (Nick)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: MinhaConta1" className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Token JWT</label>
                <textarea value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole o token JWT aqui..." rows={3} className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors resize-none font-mono text-[11px]" />
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Hunt Inicial</label>
                <div onClick={() => setShowHuntSelector(true)} className="flex items-center gap-3 w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <img src={`https://pokepixel.nietore.com/assets/imported/creatures/${pokemonSlug}/front.png`} alt={currentHuntName} className="w-12 h-12 object-contain object-bottom" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb='1'; t.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png`; } }} />
                  <div className="flex-1">
                    <div className="text-[13px] text-[rgb(var(--text-primary))] capitalize">{currentHuntName}</div>
                    <div className="text-[11px] text-[rgb(var(--text-muted))]">Clique para selecionar hunt</div>
                  </div>
                  <ChevronRight size={14} className="text-[rgb(var(--text-faint))]" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] transition-colors">Cancelar</button>
                <button type="submit" disabled={!name.trim() || !token.trim()} className="px-5 py-1.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Adicionar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {showHuntSelector && <HuntSelector hunts={huntsData} currentHunt={hunt} onSelect={(s) => { setHunt(s); setShowHuntSelector(false); }} onClose={() => setShowHuntSelector(false)} />}
    </div>
  );
}
