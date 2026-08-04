import { useState, useEffect } from "react";
import { useBotStore } from "../../stores/botStore";
import { formatNumber } from "../../lib/utils";
import { loadJSON } from "../../lib/dataLoader";
import { getItemIcon } from "../../lib/itemUtils";

interface Props {
  accountName: string;
}

export function LootTable({ accountName }: Props) {
  const { stats, logs } = useBotStore();
  const s = stats[accountName];
  const [itemsData, setItemsData] = useState<any[]>([]);

  useEffect(() => {
    loadJSON<any[]>("items_data.json").then(setItemsData);
  }, []);

  const lootDrops: Record<string, { qty: number; gold: number }> = s?.lootDrops || {};

  const drops = Object.entries(lootDrops)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 12);

  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-4">
      <h3 className="text-[13px] font-medium text-[rgb(var(--text-primary))] mb-3">Drops da Sessão</h3>



      {(() => {
        if (!s?.ballCounts) return null;
        const grouped: Record<string, { qty: number; icon: string; originalId: string }> = {};
        for (const [id, qty] of Object.entries(s.ballCounts)) {
          if (qty <= 0) continue;
          const name = ballName(id);
          if (!name) continue;
          if (!grouped[name]) grouped[name] = { qty: 0, icon: getItemIcon(id), originalId: id };
          grouped[name].qty += qty;
        }
        
        const balls = Object.entries(grouped);
        if (balls.length === 0) return null;

        return (
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">Bolas Disponíveis</div>
            <div className="flex gap-2 flex-wrap">
              {balls.map(([name, data]) => (
                <span key={name} className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] border border-[rgb(var(--border))]">
                  <img src={data.icon} alt="Ball" className="w-4 h-4 object-contain" />
                  {name}: {data.qty}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Drops</div>
      {drops.length > 0 ? (
        <div className="space-y-1.5">
          {drops.map(([name, data]) => {
            const itemDef = itemsData.find((i) => i.name.toLowerCase() === name.toLowerCase());
            const value = itemDef ? itemDef.npcPrice * data.qty : 0;
            return (
              <div key={name} className="flex items-center justify-between text-[12px] py-1 px-2 rounded-md bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-surface))] transition-colors">
                <div className="flex items-center gap-2">
                  <img src={itemDef?.icon || getItemIcon(name)} alt={name} className="w-5 h-5 object-contain" />
                  <span className="text-[rgb(var(--text-secondary))] font-medium">{name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[rgb(var(--text-muted))]">{data.qty}x</span>
                  {value > 0 && <span className="text-amber-400 font-medium w-12 text-right">${formatNumber(value)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[12px] text-[rgb(var(--text-faint))] italic py-2">Nenhum drop registrado ainda</div>
      )}
    </div>
  );
}



function ballName(id: string | number): string | null {
  const map: Record<string, string> = {
    "1": "Poke", "2": "Great", "3": "Super", "4": "Ultra", "5": "Master", "6": "Idle",
    "capsule_basic": "Poke", "capsule_great": "Great", "capsule_super": "Super", "capsule_ultra": "Ultra", "capsule_master": "Master"
  };
  if (map[String(id)]) return map[String(id)];
  if (String(id).includes("capsule") || String(id).includes("ball")) {
    return String(id).replace("capsule_", "").replace(/^./, c => c.toUpperCase());
  }
  return null;
}
