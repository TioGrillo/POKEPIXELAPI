import React, { useState, useEffect } from 'react';
import { Lock, Key, ArrowRight, RefreshCw, Shield, User, UserPlus, Zap, Palette, Check } from 'lucide-react';
import { login, register, upgrade, isAuthenticated, init } from '../lib/keyauth';
import { THEMES, applyTheme } from '../themes';
import type { Theme } from '../themes';
import Titlebar from './layout/Titlebar';

export function AuthOverlay({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState(isAuthenticated());
  const [mode, setMode] = useState<'login' | 'register' | 'upgrade' | 'updating'>('login');
  const [updateProgress, setUpdateProgress] = useState({ percent: 0, status: 'Iniciando...' });
  
  const [username, setUsername] = useState(() => localStorage.getItem("saved_username") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("saved_password") || "");
  const [licenseKey, setLicenseKey] = useState("");
  const [saveLogin, setSaveLogin] = useState(() => !!localStorage.getItem("saved_username"));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [activeTheme, setActiveTheme] = useState<Theme>(THEMES[0]);
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => {
    // Load saved theme
    try {
      const saved = localStorage.getItem('pk_settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.theme) {
          const t = THEMES.find((t) => t.id === s.theme);
          if (t) {
            setActiveTheme(t);
            applyTheme(t);
          }
        }
      } else {
        applyTheme(THEMES[0]);
      }
    } catch {
      applyTheme(THEMES[0]);
    }

    init().then((res) => {
      if (res?.updateAvailable && res.downloadUrl) {
        setMode("updating");
        (window as any).electron.send("updates:keyauth-start", res.downloadUrl);
      } else if (!res?.success) {
        setError(res?.message || "Erro de conexão com servidor.");
      } else {
        if (auth && username && password && saveLogin) {
            login(username, password).then(lres => {
                if (!lres.success) {
                    setAuth(false);
                    setError(lres.message || "Sessão expirada.");
                }
            });
        }
      }
      setLoading(false);
    });

    (window as any).electron.on("updates:keyauth-progress", (status: string, percent: number) => {
      setUpdateProgress({ percent, status });
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (saveLogin && mode === 'login') {
      localStorage.setItem("saved_username", username);
      localStorage.setItem("saved_password", password);
    } else if (mode === 'login') {
      localStorage.removeItem("saved_username");
      localStorage.removeItem("saved_password");
    }

    try {
      let res;
      if (mode === "login") {
        if (!username || !password) throw new Error("Preencha usuário e senha.");
        res = await login(username, password);
        if (res.success) setAuth(true);
      } else if (mode === "register") {
        if (!username || !password || !licenseKey) throw new Error("Preencha todos os campos.");
        res = await register(username, password, licenseKey);
        if (res.success) {
          setSuccess("Conta criada com sucesso! Faça o login.");
          setMode("login");
          setLicenseKey("");
        }
      } else if (mode === "upgrade") {
        if (!username || !licenseKey) throw new Error("Preencha usuário e nova chave.");
        res = await upgrade(username, licenseKey);
        if (res.success) {
          setSuccess("Assinatura renovada com sucesso! Faça o login.");
          setMode("login");
          setLicenseKey("");
        }
      }
      
      if (res && !res.success) {
        setError(res.message || "Erro na operação.");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const changeTheme = (theme: Theme) => {
      setActiveTheme(theme);
      applyTheme(theme);
      try {
        const raw = localStorage.getItem('pk_settings');
        const settings = raw ? JSON.parse(raw) : {};
        settings.theme = theme.id;
        localStorage.setItem('pk_settings', JSON.stringify(settings));
      } catch {
        localStorage.setItem('pk_settings', JSON.stringify({ theme: theme.id }));
      }
      setShowThemes(false);
  };

  if (auth && mode !== "updating") {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-[rgb(var(--bg-base))] flex flex-col z-50 text-white selection:bg-[rgb(var(--accent))]/30">
      <Titlebar />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md relative">
        <div className="absolute inset-0 bg-[rgb(var(--accent))]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          
          {mode !== 'updating' && (
            <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-deep))]">
              <button 
                onClick={() => { setMode('login'); setError(""); setSuccess(""); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${mode === 'login' ? 'border-[rgb(var(--accent))] text-[rgb(var(--accent))]' : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'}`}
              >
                Login
              </button>
              <button 
                onClick={() => { setMode('register'); setError(""); setSuccess(""); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${mode === 'register' ? 'border-[rgb(var(--accent))] text-[rgb(var(--accent))]' : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'}`}
              >
                Registro
              </button>
              <button 
                onClick={() => { setMode('upgrade'); setError(""); setSuccess(""); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${mode === 'upgrade' ? 'border-[rgb(var(--accent))] text-[rgb(var(--accent))]' : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'}`}
              >
                Renovar
              </button>
            </div>
          )}

          <div className="p-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-[rgb(var(--bg-deep))] rounded-2xl border border-[rgb(var(--border))] flex items-center justify-center mb-6 shadow-inner relative group cursor-pointer" onClick={() => setShowThemes(!showThemes)}>
                <img src="/LUG.png" alt="Logo" className="w-12 h-12 drop-shadow-[0_0_10px_rgba(var(--accent),0.5)]" />
                <div className="absolute -bottom-2 -right-2 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Palette size={14} className="text-[rgb(var(--text-muted))]" />
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-tight mb-2">PokePixel <span className="text-[rgb(var(--accent))]">Bot</span></h2>
              <p className="text-[rgb(var(--text-muted))] text-sm mb-8 text-center">
                {mode === 'updating' ? 'Atualização obrigatória encontrada.' : 'Sua ferramenta de automação definitiva.'}
              </p>

              {showThemes && (
                  <div className="w-full mb-6 max-h-32 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-5 gap-2">
                      {THEMES.map(t => (
                          <button
                            key={t.id}
                            onClick={() => changeTheme(t)}
                            title={t.label}
                            className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 ${activeTheme.id === t.id ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: t.preview }}
                          >
                            {activeTheme.id === t.id && <Check size={14} className="text-white drop-shadow-md" />}
                          </button>
                      ))}
                  </div>
              )}

              {mode === "updating" ? (
                <div className="w-full space-y-4 text-center">
                  <RefreshCw className="animate-spin text-[rgb(var(--accent))] mx-auto mb-4" size={32} />
                  <div className="h-2 w-full bg-[rgb(var(--bg-deep))] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[rgb(var(--accent))] transition-all duration-300"
                      style={{ width: `${updateProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-white">{updateProgress.status}</p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {updateProgress.percent.toFixed(1)}% concluído
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="w-full space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center font-medium">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm text-center font-medium">
                      {success}
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nome de Usuário"
                        className="w-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[rgb(var(--accent))] focus:ring-1 focus:ring-[rgb(var(--accent))] outline-none transition-all"
                        required
                        disabled={loading}
                      />
                    </div>

                    {(mode === 'login' || mode === 'register') && (
                        <div className="relative">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha"
                            className="w-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[rgb(var(--accent))] focus:ring-1 focus:ring-[rgb(var(--accent))] outline-none transition-all"
                            required
                            disabled={loading}
                          />
                        </div>
                    )}

                    {(mode === 'register' || mode === 'upgrade') && (
                        <div className="relative">
                          <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                          <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            placeholder="Chave de Licença (Key)"
                            className="w-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[rgb(var(--accent))] focus:ring-1 focus:ring-[rgb(var(--accent))] outline-none transition-all"
                            required
                            disabled={loading}
                          />
                        </div>
                    )}
                  </div>

                  {mode === 'login' && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer w-max">
                          <input 
                              type="checkbox" 
                              checked={saveLogin} 
                              onChange={(e) => setSaveLogin(e.target.checked)}
                              className="accent-[rgb(var(--accent))] w-4 h-4 rounded cursor-pointer bg-[rgb(var(--bg-deep))] border-[rgb(var(--border))]"
                          />
                          <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">Lembrar de mim</span>
                      </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-light))] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[rgb(var(--accent))]/20"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                      <>
                        <span>
                            {mode === 'login' ? 'Entrar no Painel' : mode === 'register' ? 'Criar Conta' : 'Ativar Licença'}
                        </span>
                        {mode === 'login' && <ArrowRight size={20} />}
                        {mode === 'register' && <UserPlus size={20} />}
                        {mode === 'upgrade' && <Zap size={20} />}
                      </>
                    )}
                  </button>
                </form>
              )}
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}
