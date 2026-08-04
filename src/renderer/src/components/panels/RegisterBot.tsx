import { useState, useEffect, useCallback, useRef } from "react";
import { invoke, on } from "../../lib/ipc";
import { createDefaultAccount } from "../../types";
import {
  UserPlus, RefreshCw, Trash2, Eye, EyeOff, CheckCircle2,
  XCircle, Clock, Download, ChevronDown, ChevronUp, Search, Edit2, X, Zap, Mail
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface RegisteredAccount {
  id: string;
  login: string;
  password: string;
  nick: string;
  trainerName: string;
  token: string;
  registeredAt: number;
  lastLoginAt?: number;
  status: "ok" | "error" | "pending" | "refreshing";
  errorMsg?: string;
  addedToBot: boolean;
  restoreKey?: string;
  starterId?: number;
  gender?: string;
}

interface RegisterConfig {
  count: number;
  password: string;
  prefix: string;
  usePrefix: boolean;
  avoidNumbers: boolean;
  starterId: number;
  gender: string;
}

interface BrowserProgress {
  current: number;
  total: number;
  nick: string;
  action: string;
  jobIndex?: number;
  jobLabel?: string;
  state?: string;
  result?: {
    login: string;
    nick: string;
    success: boolean;
    token: string;
    message: string;
    password?: string;
  };
}

type SortKey = "registeredAt" | "nick" | "status" | "lastLoginAt";
type FilterStatus = "all" | "ok" | "error" | "pending";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmtDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
export function RegisterBot({ onAccountsChanged }: { onAccountsChanged?: () => void }) {
  const [history, setHistory] = useState<RegisteredAccount[]>([]);

  // ── Form
  const [genCount, setGenCount] = useState(Number(localStorage.getItem("rb_count")) || 1);
  const [genPassword, setGenPassword] = useState(localStorage.getItem("rb_pass") || "Senha@2025");
  const [genPrefix, setGenPrefix] = useState(localStorage.getItem("rb_prefix") || "Player");
  const [usePrefix, setUsePrefix] = useState(localStorage.getItem("rb_usePrefix") !== "false");
  const [avoidNumbers, setAvoidNumbers] = useState(localStorage.getItem("rb_avoidNum") === "true");
  const [delayMs, setDelayMs] = useState(Number(localStorage.getItem("rb_delay")) || 3000);
  const [gender, setGender] = useState<"male" | "female">(localStorage.getItem("rb_gender") as "male" | "female" || "male");
  const [starterId, setStarterId] = useState(localStorage.getItem("rb_starter") || "squirtle");
  const [isRunning, setIsRunning] = useState(false);

  const [editingEntry, setEditingEntry] = useState<RegisteredAccount | null>(null);
  const [editLogin, setEditLogin] = useState("");
  const [editNick, setEditNick] = useState("");

  function openEditModal(entry: RegisteredAccount) {
    setEditingEntry(entry);
    setEditLogin(entry.login);
    setEditNick(entry.nick);
  }

  function saveEdit() {
    if (!editingEntry) return;
    setHistory((prev) => {
      const next = prev.map((h) =>
        h.id === editingEntry.id ? { ...h, login: editLogin, nick: editNick, trainerName: editNick } : h
      );
      invoke("regbot:history-save", next);
      return next;
    });
    setEditingEntry(null);
  }

  const [runLog, setRunLog] = useState<{ msg: string; type: "ok" | "err" | "info" }[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── UI state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showGenPassword, setShowGenPassword] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("registeredAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    invoke<any[]>("regbot:history-get").then((h) => {
      if (!Array.isArray(h)) return;
      setHistory(h);
    });
  }, []);

  // Auto scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [runLog]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("rb_count", String(genCount));
    localStorage.setItem("rb_pass", genPassword);
    localStorage.setItem("rb_prefix", genPrefix);
    localStorage.setItem("rb_usePrefix", String(usePrefix));
    localStorage.setItem("rb_avoidNum", String(avoidNumbers));
    localStorage.setItem("rb_delay", String(delayMs));
    localStorage.setItem("rb_gender", gender);
    localStorage.setItem("rb_starter", starterId);
  }, [genCount, genPassword, genPrefix, usePrefix, avoidNumbers, delayMs, gender, starterId]);

  const saveHistory = useCallback(async (list: RegisteredAccount[]) => {
    setHistory(list);
    await invoke("regbot:history-save", list);
  }, []);

  function pushLog(msg: string, type: "ok" | "err" | "info" = "info") {
    setRunLog((p) => [...p.slice(-299), { msg, type }]);
  }

  // ── Registro via API (Mail.tm + PokePixel)
  async function runBulkApi() {
    if (genCount < 1) {
      pushLog("Quantidade de contas inválida.", "err");
      return;
    }

    const config = {
      numberAccounts: genCount,
      password: genPassword,
      prefix: genPrefix,
      useCustomPrefix: usePrefix,
      avoidNumbers,
      gender,
      starterId
    };

    setIsRunning(true);
    setRunLog([]);
    setProgress({ current: 0, total: genCount });
    pushLog(`🚀 Iniciando registro de ${genCount} conta(s) via API do PokePixel...`, "info");
    pushLog(`📧 Usando Mail.tm para emails temporários com verificação automática.`, "info");

    const unsubProgress = on("regbot:progress", (info: unknown) => {
      const prog = info as BrowserProgress;

      // Atualiza progresso
      if (prog.current !== undefined) {
        setProgress({ current: prog.current, total: prog.total });
      }

      const label = prog.jobLabel || `[${prog.nick || "?"}]`;
      const state = prog.state || prog.action || "";
      if (state) {
        const isErr = state.startsWith("✗") || state.toLowerCase().includes("erro") || state.toLowerCase().includes("falh");
        const isOk = state.startsWith("✓");
        pushLog(`${label} ${state}`, isOk ? "ok" : isErr ? "err" : "info");
      }

      // Quando chega resultado
      if (prog.result) {
        const r = prog.result;
        setHistory((prev) => {
          const existing = prev.find((h) => h.nick === r.nick);
          if (existing) {
            const updated = prev.map((h) =>
              h.nick === r.nick ? {
                ...h,
                status: r.success ? "ok" as const : "error" as const,
                token: r.success && r.token ? r.token : h.token,
                lastLoginAt: r.success ? Date.now() : h.lastLoginAt,
                errorMsg: r.success ? undefined : r.message,
              } : h
            );
            invoke("regbot:history-save", updated);
            return updated;
          } else {
            const newEntry: RegisteredAccount = {
              id: uid(),
              login: r.login,
              password: r.password || genPassword,
              nick: r.nick,
              trainerName: r.nick,
              token: r.token || "",
              registeredAt: Date.now(),
              lastLoginAt: r.success ? Date.now() : undefined,
              status: r.success ? "ok" : "error",
              errorMsg: r.success ? undefined : r.message,
              addedToBot: false,
            };
            const updated = [...prev, newEntry];
            invoke("regbot:history-save", updated);
            return updated;
          }
        });
      }
    });

    try {
      const res = await invoke<{ success: boolean; results: any[]; message?: string }>(
        "regbot:run-browser",
        { config, delayMs }
      );
      if (res?.success) {
        const ok = res.results?.filter((r) => r.success).length ?? 0;
        pushLog(`✓ Concluído! ${ok}/${genCount} conta(s) registrada(s) com sucesso.`, "ok");
      } else {
        pushLog(`✗ Erro: ${res?.message || "Falha desconhecida"}`, "err");
      }
    } catch (e: any) {
      pushLog(`✗ Exceção: ${e.message}`, "err");
    } finally {
      unsubProgress();
      setIsRunning(false);
    }
  }

  // ── Renovar token de conta individual via login direto
  async function refreshTokenApi(id: string) {
    const entry = history.find((h) => h.id === id);
    if (!entry || !entry.login || !entry.password) {
      pushLog(`[${entry?.nick || "?"}] Sem credenciais salvas para renovar token.`, "err");
      return;
    }

    setRunLog((prev) => [...prev, { msg: `Renovando token de [${entry.nick}] via login direto...`, type: "info" }]);
    const updatedRefreshing = history.map((h) => h.id === id ? { ...h, status: "refreshing" as const } : h);
    setHistory(updatedRefreshing);

    try {
      const res = await invoke<{ success: boolean; token: string; message?: string }>(
        "regbot:login",
        { login: entry.login, password: entry.password }
      );
      setHistory((prev) => {
        const next = prev.map((h) =>
          h.id === id ? {
            ...h,
            status: res.success ? "ok" as const : "error" as const,
            token: res.success && res.token ? res.token : h.token,
            lastLoginAt: res.success ? Date.now() : h.lastLoginAt,
            errorMsg: res.success ? undefined : res.message,
          } : h
        );
        invoke("regbot:history-save", next);
        return next;
      });
      if (res.success) {
        pushLog(`✓ [${entry.nick}] Token renovado com sucesso!`, "ok");
      } else {
        pushLog(`✗ [${entry.nick}] Falha ao renovar: ${res.message}`, "err");
      }
    } catch (e: any) {
      pushLog(`✗ [${entry.nick}] Erro: ${e.message}`, "err");
      setHistory((prev) => {
        const next = prev.map((h) => h.id === id ? { ...h, status: "error" as const, errorMsg: e.message } : h);
        invoke("regbot:history-save", next);
        return next;
      });
    }
  }

  // ── Renovar TODOS os tokens
  async function refreshAllTokens() {
    const valid = history.filter((h) => h.login && h.password);
    if (valid.length === 0) {
      pushLog("Nenhuma conta com email/senha salva para renovar.", "err");
      return;
    }
    setIsRunning(true);
    pushLog(`Renovando tokens de ${valid.length} conta(s)...`, "info");
    let ok = 0;
    for (const entry of valid) {
      try {
        const res = await invoke<{ success: boolean; token: string; message?: string }>(
          "regbot:login",
          { login: entry.login, password: entry.password }
        );
        setHistory((prev) => {
          const next = prev.map((h) =>
            h.id === entry.id ? {
              ...h,
              status: res.success ? "ok" as const : "error" as const,
              token: res.success && res.token ? res.token : h.token,
              lastLoginAt: res.success ? Date.now() : h.lastLoginAt,
              errorMsg: res.success ? undefined : res.message,
            } : h
          );
          invoke("regbot:history-save", next);
          return next;
        });
        if (res.success) {
          ok++;
          pushLog(`✓ [${entry.nick}] Token renovado!`, "ok");
        } else {
          pushLog(`✗ [${entry.nick}] Falha: ${res.message}`, "err");
        }
        await new Promise(r => setTimeout(r, 800));
      } catch (e: any) {
        pushLog(`✗ [${entry.nick}] Erro: ${e.message}`, "err");
      }
    }
    pushLog(`✓ Concluído! ${ok}/${valid.length} tokens renovados.`, "ok");
    setIsRunning(false);
  }

  // ── Adicionar ao bot
  async function addToBot(id: string) {
    const entry = history.find((h) => h.id === id);
    if (!entry || !entry.token) return;
    const existing = await invoke<any[]>("accounts:list") || [];
    const alreadyExists = existing.some((a) => a.name === entry.nick);
    if (alreadyExists) {
      const updated = existing.map((a) => a.name === entry.nick ? { ...a, token: entry.token } : a);
      await invoke("accounts:save", updated);
      pushLog(`[${entry.nick}] Token atualizado no bot!`, "ok");
    } else {
      const acc = createDefaultAccount(entry.nick, entry.token, "");
      (acc as any).email = entry.login;
      (acc as any).password = entry.password;
      await invoke("accounts:save", [...existing, acc]);
      pushLog(`[${entry.nick}] Adicionada ao bot!`, "ok");
    }
    const next = history.map((h) => h.id === id ? { ...h, addedToBot: true } : h);
    await saveHistory(next);
    onAccountsChanged?.();
  }

  // ── Adicionar todas as OK ao bot
  async function addAllToBot() {
    const okEntries = history.filter((h) => h.status === "ok" && h.token);
    const existing = await invoke<any[]>("accounts:list") || [];
    const existingNames = new Set(existing.map((a) => a.name));
    let added = 0;
    const toAdd = [...existing];
    for (const entry of okEntries) {
      if (existingNames.has(entry.nick)) {
        const idx = toAdd.findIndex((a) => a.name === entry.nick);
        if (idx >= 0) toAdd[idx] = { ...toAdd[idx], token: entry.token };
      } else {
        const acc = createDefaultAccount(entry.nick, entry.token, "");
        (acc as any).email = entry.login;
        (acc as any).password = entry.password;
        toAdd.push(acc);
        existingNames.add(entry.nick);
        added++;
      }
    }
    await invoke("accounts:save", toAdd);
    const next = history.map((h) => h.status === "ok" && h.token ? { ...h, addedToBot: true } : h);
    await saveHistory(next);
    onAccountsChanged?.();
    pushLog(`✓ ${added} conta(s) adicionadas, ${okEntries.length - added} token(s) atualizado(s)!`, "ok");
  }

  // ── Importar contas de JSON
  async function importFromAccountsJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const content = ev.target?.result as string;
          const existing = JSON.parse(content);
          if (!Array.isArray(existing)) throw new Error("O arquivo JSON não contém uma lista válida.");

          setHistory((prev) => {
            let added = 0;
            const next = [...prev];
            for (const acc of existing) {
              if (!acc.email && !acc.name) continue;
              const exists = next.find((h) => h.nick === acc.name);
              if (!exists) {
                next.push({
                  id: uid(),
                  login: acc.email || "",
                  password: acc.password || "",
                  nick: acc.name,
                  trainerName: acc.name,
                  token: acc.token || "",
                  registeredAt: Date.now(),
                  status: acc.token ? "ok" : "pending",
                  addedToBot: true,
                  restoreKey: "",
                });
                added++;
              }
            }
            if (added > 0) {
              invoke("regbot:history-save", next);
              pushLog(`✓ ${added} conta(s) importada(s)!`, "ok");
              return next;
            } else {
              pushLog("Nenhuma conta nova para importar.", "info");
              return prev;
            }
          });
        } catch (err: any) {
          pushLog(`✗ Erro ao importar: ${err.message}`, "err");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Deletar entrada
  async function deleteEntry(id: string) {
    const next = history.filter((h) => h.id !== id);
    await saveHistory(next);
  }

  // ── Exportar CSV
  function exportCsv() {
    const rows = [["nick", "email", "senha", "token", "registrado", "ultimo_login", "status"].join(";")];
    for (const h of history) {
      rows.push([h.nick, h.login, h.password, h.token, fmtDate(h.registeredAt), fmtDate(h.lastLoginAt), h.status].join(";"));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contas_pokepixel_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Tabela filtrada/ordenada
  const displayed = history
    .filter((h) => {
      if (filterStatus !== "all" && h.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return h.nick.toLowerCase().includes(q) || h.login.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "registeredAt") v = (a.registeredAt || 0) - (b.registeredAt || 0);
      else if (sortKey === "lastLoginAt") v = (a.lastLoginAt || 0) - (b.lastLoginAt || 0);
      else if (sortKey === "nick") v = a.nick.localeCompare(b.nick);
      else if (sortKey === "status") v = a.status.localeCompare(b.status);
      return sortAsc ? v : -v;
    });

  const okCount = history.filter((h) => h.status === "ok").length;
  const errCount = history.filter((h) => h.status === "error").length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown size={10} className="opacity-30" />;
    return sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[rgb(var(--bg-deep))]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgb(var(--border))] shrink-0">
        <Zap size={15} className="text-[rgb(var(--accent))]" />
        <h2 className="text-[14px] font-semibold text-[rgb(var(--text-primary))]">Registro Automático — PokePixel</h2>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-green-600/20 text-green-400">{okCount} ok</span>
          <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400">{errCount} erro</span>
          <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))]">{history.length} total</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Painel Esquerdo */}
        <div className="w-[290px] shrink-0 flex flex-col border-r border-[rgb(var(--border))] overflow-y-auto p-4 space-y-3">

          {/* Info banner */}
          <div className="bg-[rgb(var(--accent))]/10 border border-[rgb(var(--accent))]/20 rounded-md px-3 py-2 text-[11px] text-[rgb(var(--accent))] leading-relaxed">
            <Mail size={11} className="inline mr-1 -mt-0.5" />
            Registro 100% automático via API. Usa Mail.tm para criação de email temporário e verificação automática.
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1 font-semibold">Quantidade de Contas</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGenCount(Math.max(1, genCount - 1))}
                className="w-8 h-8 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--accent))]/10 flex items-center justify-center font-bold"
              >-</button>
              <input
                type="number" min={1} max={100}
                value={genCount}
                onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                className="flex-1 px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] text-center"
              />
              <button
                onClick={() => setGenCount(genCount + 1)}
                className="w-8 h-8 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--accent))]/10 flex items-center justify-center font-bold"
              >+</button>
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1 font-semibold">Senha das Contas</label>
            <div className="relative">
              <input
                type={showGenPassword ? "text" : "password"}
                value={genPassword}
                onChange={(e) => setGenPassword(e.target.value)}
                className="w-full pl-2 pr-8 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]"
                placeholder="Senha Padrão"
              />
              <button type="button" onClick={() => setShowGenPassword(!showGenPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))]">
                {showGenPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Prefixo Nick */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Prefixo do Nick</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={avoidNumbers} onChange={(e) => setAvoidNumbers(e.target.checked)}
                    className="accent-[rgb(var(--accent))] w-3 h-3" />
                  <span className="text-[10px] text-[rgb(var(--text-secondary))] whitespace-nowrap">Sem Números</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={usePrefix} onChange={(e) => setUsePrefix(e.target.checked)}
                    className="accent-[rgb(var(--accent))] w-3 h-3" />
                  <span className="text-[10px] text-[rgb(var(--text-secondary))]">Ativo</span>
                </label>
              </div>
            </div>
            <input type="text" value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)}
              disabled={!usePrefix}
              className="w-full px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] disabled:opacity-50"
              placeholder="Ex: Player" />
          </div>

          {/* Sexo do Treinador */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1 font-semibold">Sexo do Treinador</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "male" | "female")}
              className="w-full px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]"
            >
              <option value="male">Masculino (Menino)</option>
              <option value="female">Feminino (Menina)</option>
            </select>
          </div>

          {/* Starter Inicial */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1 font-semibold">Pokémon Inicial</label>
            <select
              value={starterId}
              onChange={(e) => setStarterId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]"
            >
              <option value="bulbasaur">Bulbasaur</option>
              <option value="charmander">Charmander</option>
              <option value="squirtle">Squirtle</option>
              <option value="pikachu">Pikachu</option>
              <option value="eevee">Eevee</option>
            </select>
          </div>

          {/* Delay */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1 font-semibold">Atraso entre contas (ms)</label>
            <input type="number" value={delayMs}
              onChange={(e) => setDelayMs(Math.max(1000, Number(e.target.value)))}
              min={1000} max={15000} step={500}
              className="w-full px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]"
            />
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-1">
            <button onClick={runBulkApi} disabled={isRunning || genCount < 1}
              className="w-full py-2 rounded-md text-[12px] font-semibold bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/25 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              <Zap size={13} />
              {isRunning ? `Registrando... (${progress.current}/${progress.total})` : `Registrar ${genCount} Conta(s)`}
            </button>
            <button onClick={refreshAllTokens} disabled={isRunning || history.length === 0}
              className="w-full py-2 rounded-md text-[12px] font-medium bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              <RefreshCw size={13} />
              Renovar Todos os Tokens
            </button>
            <button onClick={addAllToBot} disabled={isRunning || okCount === 0}
              className="w-full py-2 rounded-md text-[12px] font-medium bg-green-600/15 text-green-400 hover:bg-green-600/25 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={13} />
              Adicionar Todas (OK) ao Bot
            </button>
            <button onClick={importFromAccountsJson} disabled={isRunning}
              className="w-full py-2 rounded-md text-[12px] font-medium bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/25 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              <UserPlus size={13} />
              Importar Contas (JSON)
            </button>
            <button onClick={exportCsv} disabled={history.length === 0}
              className="w-full py-1.5 rounded-md text-[11px] font-medium bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 border border-[rgb(var(--border))]">
              <Download size={12} />
              Exportar CSV
            </button>
          </div>

          {/* Barra de progresso */}
          {isRunning && progress.total > 0 && (
            <div className="w-full bg-[rgb(var(--bg-surface))] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-[rgb(var(--accent))] transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}

          {/* Log */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1 font-semibold">Log de Operações</label>
            <div className="h-44 overflow-y-auto bg-[rgb(var(--bg-deep))] rounded-md border border-[rgb(var(--border))] p-2 space-y-0.5 font-mono text-[10px]">
              {runLog.length === 0 && <div className="text-[rgb(var(--text-faint))]">Aguardando...</div>}
              {runLog.map((l, i) => (
                <div key={i} className={l.type === "ok" ? "text-green-400" : l.type === "err" ? "text-red-400" : "text-[rgb(var(--text-secondary))]"}>
                  {l.msg}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Painel Direito: tabela de contas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgb(var(--border))] shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nick ou email..."
                className="pl-7 pr-3 py-1 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] w-52" />
            </div>
            <div className="flex gap-1">
              {(["all", "ok", "error", "pending"] as FilterStatus[]).map((f) => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${filterStatus === f ? "bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"}`}>
                  {f === "all" ? "Todos" : f === "ok" ? "OK" : f === "error" ? "Erros" : "Pendentes"}
                </button>
              ))}
            </div>
            <span className="ml-auto text-[11px] text-[rgb(var(--text-faint))]">{displayed.length} exibidos</span>
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[rgb(var(--text-faint))] gap-2">
                <UserPlus size={32} className="opacity-20" />
                <p className="text-[13px]">Nenhuma conta registrada ainda.</p>
                <p className="text-[11px] opacity-60">Use o painel ao lado para criar contas no PokePixel</p>
              </div>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-[rgb(var(--bg-deep))] border-b border-[rgb(var(--border))]">
                  <tr>
                    <th className="text-left px-4 py-2 text-[rgb(var(--text-muted))] font-medium cursor-pointer hover:text-[rgb(var(--text-primary))]" onClick={() => toggleSort("nick")}>
                      <span className="flex items-center gap-1">Nick <SortIcon k="nick" /></span>
                    </th>
                    <th className="text-left px-4 py-2 text-[rgb(var(--text-muted))] font-medium">Email</th>
                    <th className="text-left px-4 py-2 text-[rgb(var(--text-muted))] font-medium cursor-pointer hover:text-[rgb(var(--text-primary))]" onClick={() => toggleSort("status")}>
                      <span className="flex items-center gap-1">Status <SortIcon k="status" /></span>
                    </th>
                    <th className="text-left px-4 py-2 text-[rgb(var(--text-muted))] font-medium cursor-pointer hover:text-[rgb(var(--text-primary))]" onClick={() => toggleSort("registeredAt")}>
                      <span className="flex items-center gap-1">Registrado <SortIcon k="registeredAt" /></span>
                    </th>
                    <th className="text-left px-4 py-2 text-[rgb(var(--text-muted))] font-medium cursor-pointer hover:text-[rgb(var(--text-primary))]" onClick={() => toggleSort("lastLoginAt")}>
                      <span className="flex items-center gap-1">Último Login <SortIcon k="lastLoginAt" /></span>
                    </th>
                    <th className="text-left px-4 py-2 text-[rgb(var(--text-muted))] font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((h) => (
                    <tr key={h.id} className="border-b border-[rgb(var(--border))]/40 hover:bg-[rgb(var(--bg-surface))]/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[rgb(var(--text-primary))]">{h.nick}</div>
                        {h.addedToBot && <div className="text-[10px] text-green-400 mt-0.5">✓ No Bot</div>}
                      </td>
                      <td className="px-4 py-2.5 text-[rgb(var(--text-muted))] max-w-[160px] truncate">{h.login || "—"}</td>
                      <td className="px-4 py-2.5">
                        {h.status === "ok" && <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={12} />OK</span>}
                        {h.status === "error" && <span className="flex items-center gap-1 text-red-400" title={h.errorMsg}><XCircle size={12} />Erro</span>}
                        {h.status === "pending" && <span className="flex items-center gap-1 text-yellow-400"><Clock size={12} />Pendente</span>}
                        {h.status === "refreshing" && <span className="flex items-center gap-1 text-blue-400"><RefreshCw size={12} className="animate-spin" />Renovando</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[rgb(var(--text-faint))]">{fmtDate(h.registeredAt)}</td>
                      <td className="px-4 py-2.5 text-[rgb(var(--text-faint))]">{fmtDate(h.lastLoginAt)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => refreshTokenApi(h.id)} title="Renovar token"
                            className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400 transition-colors">
                            <RefreshCw size={12} />
                          </button>
                          <button onClick={() => addToBot(h.id)} title="Adicionar ao bot"
                            disabled={!h.token}
                            className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-30">
                            <CheckCircle2 size={12} />
                          </button>
                          <button onClick={() => openEditModal(h)} title="Editar"
                            className="p-1.5 rounded hover:bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))] transition-colors">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => { if (confirm(`Remover ${h.nick}?`)) deleteEntry(h.id); }} title="Remover"
                            className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[400px] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[rgb(var(--text-primary))]">Editar Conta</h3>
              <button onClick={() => setEditingEntry(null)} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"><X size={14} /></button>
            </div>
            <div>
              <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Email / Login</label>
              <input value={editLogin} onChange={(e) => setEditLogin(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]" />
            </div>
            <div>
              <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Nick</label>
              <input value={editNick} onChange={(e) => setEditNick(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditingEntry(null)} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))]">Cancelar</button>
              <button onClick={saveEdit} className="px-4 py-1.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
