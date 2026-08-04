import { useState, useEffect, useRef } from "react";
import { invoke } from "../../lib/ipc";
import { applyTheme, applyCustomAccent, THEMES } from "../../lib/themes";
import { Eye, EyeOff, LogIn, UserPlus, RefreshCw, Key, User, Lock } from "lucide-react";
import logoSrc from "../../assets/logo.png";

type AuthMode = "login" | "register" | "upgrade";

interface LoginPageProps {
  onAuthenticated: () => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState("#ef4444");
  const [loading, setLoading] = useState(false);
  const [savedUser, setSavedUser] = useState("");
  const [savedPass, setSavedPass] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<any>("auth:check").then((result) => {
      if (result?.success) {
        onAuthenticated();
        return;
      }
    });
    invoke<{ user: string; pass: string }>("auth:get-saved").then((saved) => {
      if (saved) {
        setSavedUser(saved.user || "");
        setSavedPass(saved.pass || "");
        setUsername(saved.user || "");
        setPassword(saved.pass || "");
      }
    });
    invoke<any>("settings:get").then((s) => {
      if (s) {
        const theme = THEMES.find((t) => t.id === s.theme);
        if (theme) applyTheme(theme);
        else if (s.customAccent) applyCustomAccent(s.customAccent);
      }
    });
    userRef.current?.focus();
  }, []);

  const set_status = (msg: string, color = "#ef4444") => {
    setStatus(msg);
    setStatusColor(color);
  };

  const handleSubmit = async () => {
    if (loading) return;
    const u = username.trim();
    const p = password;

    if (!u || !p) {
      set_status("Preencha usuario e senha!");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      set_status("Verificando...", "var(--accent, #8b5cf6)");
      const result = await invoke<{ success: boolean; message: string }>("auth:login", u, p);
      if (result?.success) {
        set_status("Autenticado!", "#22c55e");
        if (rememberMe) await invoke("auth:save-credentials", u, p);
        setTimeout(() => onAuthenticated(), 300);
      } else {
        set_status(result?.message || "Falha ao autenticar.");
      }
    } else if (mode === "register") {
      const key = licenseKey.trim();
      if (!key) {
        set_status("Preencha a chave de licenca!");
        setLoading(false);
        return;
      }
      if (p !== passwordConfirm) {
        set_status("Senhas nao conferem!");
        setLoading(false);
        return;
      }
      set_status("Registrando...", "var(--accent, #8b5cf6)");
      const result = await invoke<{ success: boolean; message: string }>("auth:register", u, p, key);
      if (result?.success) {
        set_status("Conta criada com sucesso!", "#22c55e");
        setMode("login");
        setPassword("");
        setPasswordConfirm("");
        setLicenseKey("");
      } else {
        set_status(result?.message || "Falha ao registrar.");
      }
    } else {
      const key = licenseKey.trim();
      if (!key) {
        set_status("Preencha a nova chave de licenca!");
        setLoading(false);
        return;
      }
      set_status("Renovando...", "var(--accent, #8b5cf6)");
      const result = await invoke<{ success: boolean; message: string }>("auth:upgrade", u, p, key);
      if (result?.success) {
        set_status("Licenca renovada! Faca login agora.", "#22c55e");
        setMode("login");
        setLicenseKey("");
      } else {
        set_status(result?.message || "Falha ao renovar.");
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setStatus("");
    if (mode === "login") setMode("register");
    else setMode("login");
  };

  const titleText = mode === "login" ? "POKEPIXEL BOT" : mode === "register" ? "CRIAR CONTA" : "RENOVAR LICENCA";
  const subtitleText = mode === "login"
    ? "Entre com suas credenciais para continuar"
    : mode === "register"
      ? "Preencha os dados e insira sua chave"
      : "Insira usuario, senha e a nova chave";
  const btnText = mode === "login" ? "ENTRAR" : mode === "register" ? "CRIAR CONTA" : "RENOVAR LICENCA";
  const btnIcon = mode === "login" ? <LogIn size={14} /> : mode === "register" ? <UserPlus size={14} /> : <RefreshCw size={14} />;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgb(var(--bg-deep))]">
      <div className="w-full max-w-[400px] p-6">
        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 pb-4 text-center">
            <div className="flex items-center justify-center mb-4">
              <img src={logoSrc} alt="Logo" className="w-16 h-16 object-contain rounded-xl bg-[rgb(var(--bg-surface))] shadow-md p-1.5" />
            </div>
            <h1 className="text-[18px] font-bold text-[rgb(var(--text-primary))] tracking-wide">{titleText}</h1>
            <p className="text-[11px] text-[rgb(var(--text-muted))] mt-1">{subtitleText}</p>
          </div>

          <div className="border-t border-[rgb(var(--border))] mx-4" />

          <div className="p-6 pt-4 space-y-3">
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
              <input
                ref={userRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="relative">
              <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-muted))] transition-colors"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>

            {mode === "register" && (
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Confirmar senha"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
            )}

            {(mode === "register" || mode === "upgrade") && (
              <div className="relative">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Chave de licenca"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
            )}

            {mode === "login" && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[rgb(var(--bg-surface))] border-[rgb(var(--border))] text-[rgb(var(--accent))] focus:ring-[rgb(var(--accent))]"
                />
                <span className="text-[11px] text-[rgb(var(--text-muted))]">Lembrar credenciais</span>
              </label>
            )}

            {status && (
              <div className="text-[12px] font-medium text-center py-1 rounded" style={{ color: statusColor }}>
                {status}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {btnIcon}
              {loading ? "AGUARDE..." : btnText}
            </button>
          </div>

          <div className="border-t border-[rgb(var(--border))] mx-4" />

          <div className="p-4 flex items-center justify-center gap-4">
            {mode === "login" ? (
              <>
                <button onClick={toggleMode} className="text-[12px] font-semibold text-[rgb(var(--accent))] hover:underline transition-colors">
                  REGISTRE-SE
                </button>
                <button onClick={() => { setMode("upgrade"); setStatus(""); }} className="text-[12px] font-semibold text-[rgb(var(--accent))] hover:underline transition-colors">
                  RENOVE
                </button>
              </>
            ) : (
              <button onClick={() => { setMode("login"); setStatus(""); }} className="text-[12px] font-semibold text-[rgb(var(--accent))] hover:underline transition-colors">
                VOLTAR AO LOGIN
              </button>
            )}
          </div>

          <div className="pb-4 text-center">
            <span className="text-[10px] text-[rgb(var(--text-faint))]">PokePixelBot v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
