import { useState } from "react";
import { invoke } from "../../lib/ipc";
import { Heart, Zap, RefreshCw, Shield } from "lucide-react";

interface Props {
  accountName: string;
}

export function NurseJoyPanel({ accountName }: Props) {
  const [healing, setHealing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const heal = async (type: "joy" | "potion" | "revive" | "all") => {
    setHealing(true);
    setResult(null);
    try {
      let msg = "";
      if (type === "joy" || type === "all") {
        await invoke("bot:nurse-joy", accountName);
        msg += "Curado na Nurse Joy! ";
      }
      if (type === "potion" || type === "all") {
        await invoke("bot:use-potion", accountName);
        msg += "Poção usada! ";
      }
      if (type === "revive" || type === "all") {
        await invoke("bot:use-revive", accountName);
        msg += "Revive usado! ";
      }
      setResult({ ok: true, msg: msg || "Cura realizada!" });
    } catch (e: any) {
      setResult({ ok: false, msg: e.message || "Erro ao curar." });
    }
    setHealing(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
          <Heart size={20} className="text-pink-400" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-[rgb(var(--text-primary))]">Nurse Joy</h2>
          <p className="text-[11px] text-[rgb(var(--text-muted))]">Centro Pokémon — cura e revigoramento</p>
        </div>
      </div>

      {result && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[12px] ${
          result.ok
            ? "bg-green-500/10 border border-green-500/20 text-green-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {result.ok ? <Heart size={14} /> : <Shield size={14} />}
          {result.msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <HealCard
          icon={<Heart size={18} className="text-pink-400" />}
          title="Nurse Joy"
          description="Cura completa gratuita no Centro Pokémon"
          btnLabel="Curar no Centro"
          btnColor="bg-pink-600 hover:bg-pink-500"
          loading={healing}
          onClick={() => heal("joy")}
        />
        <HealCard
          icon={<Zap size={18} className="text-green-400" />}
          title="Usar Poção"
          description="Usa a melhor poção disponível no inventário"
          btnLabel="Usar Poção"
          btnColor="bg-green-600 hover:bg-green-500"
          loading={healing}
          onClick={() => heal("potion")}
        />
        <HealCard
          icon={<RefreshCw size={18} className="text-blue-400" />}
          title="Usar Revive"
          description="Revive o Pokémon líder se estiver desmaiado"
          btnLabel="Usar Revive"
          btnColor="bg-blue-600 hover:bg-blue-500"
          loading={healing}
          onClick={() => heal("revive")}
        />
        <HealCard
          icon={<Shield size={18} className="text-purple-400" />}
          title="Cura Completa"
          description="Joy + Poção + Revive em sequência"
          btnLabel="Cura Total"
          btnColor="bg-purple-600 hover:bg-purple-500"
          loading={healing}
          onClick={() => heal("all")}
        />
      </div>

      <div className="bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))] rounded-lg p-4">
        <p className="text-[11px] text-[rgb(var(--text-muted))] leading-relaxed">
          <strong className="text-[rgb(var(--text-secondary))]">Dica:</strong> A cura automática é ativada quando o HP do líder cai abaixo do limite configurado.
          Use os botões acima para forçar uma cura manual a qualquer momento.
        </p>
      </div>
    </div>
  );
}

function HealCard({
  icon, title, description, btnLabel, btnColor, loading, onClick
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  btnLabel: string;
  btnColor: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">{title}</span>
      </div>
      <p className="text-[11px] text-[rgb(var(--text-muted))] flex-1">{description}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full py-2 rounded-lg text-[12px] font-medium text-white transition-colors disabled:opacity-40 ${btnColor}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw size={12} className="animate-spin" /> Aguarde...
          </span>
        ) : btnLabel}
      </button>
    </div>
  );
}
