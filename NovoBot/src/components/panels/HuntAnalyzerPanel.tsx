import { useMemo, useState, useEffect } from 'react';
import type { Account } from '../../types';
import { Target, Clock } from 'lucide-react';

interface HuntAnalyzerPanelProps {
  accounts: Account[];
  isGlobal?: boolean;
}

export function HuntAnalyzerPanel({ accounts, isGlobal = false }: HuntAnalyzerPanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const result = {
      activeHunts: 0,
      totalDurationMs: 0,
      expGained: 0,
      moneyGained: 0,
      lootValue: 0,
      pokeballsUsed: 0,
      potionsUsed: 0,
      encounters: 0,
      captures: 0,
      shinies: 0,
      shiniesCaught: 0,
    };

    let oldestStartTime = now;
    let anyHunting = false;

    for (const acc of accounts) {
      if (acc.sessionStats && (acc.status === 'hunting' || acc.sessionStats.encounters > 0)) {
        if (acc.status === 'hunting') {
          anyHunting = true;
        }
        result.activeHunts++;
        result.expGained += acc.sessionStats.expGained || 0;
        result.moneyGained += acc.sessionStats.moneyGained || 0;
        result.lootValue += acc.sessionStats.lootValue || 0;
        result.pokeballsUsed += acc.sessionStats.pokeballsUsed || 0;
        result.potionsUsed += acc.sessionStats.potionsUsed || 0;
        result.encounters += acc.sessionStats.encounters || 0;
        result.captures += acc.sessionStats.captures || 0;
        result.shinies += acc.sessionStats.shinies || 0;
        result.shiniesCaught += acc.sessionStats.shinies || 0;
        
        if (acc.sessionStats.startTime < oldestStartTime) {
          oldestStartTime = acc.sessionStats.startTime;
        }
      }
    }

    result.totalDurationMs = anyHunting ? Math.max(0, now - oldestStartTime) : 0;
    return result;
  }, [accounts, now]);

  const durationSecs = stats.totalDurationMs / 1000;
  // Prevent astronomically high per-hour rates in the first few seconds
  // by assuming at least 1 minute (60s) of runtime for the calculation.
  const hours = durationSecs > 0 ? Math.max(durationSecs, 60) / 3600 : 0;

  const dollarsPerHour = hours > 0 ? Math.round(stats.moneyGained / hours) : 0;
  const expPerHour = hours > 0 ? Math.round(stats.expGained / hours) : 0;
  const killsPerHour = hours > 0 ? (stats.encounters / hours).toFixed(1) : "0.0";

  // Financials
  const dollarsReceived = stats.moneyGained;
  const lootSaleValue = stats.lootValue;
  const captureValue = stats.captures * 100; // Estimated $100 per catch
  const suppliesCost = (stats.pokeballsUsed * 200) + (stats.potionsUsed * 300); // Estimated cost
  const estimatedBalance = dollarsReceived + lootSaleValue + captureValue - suppliesCost;

  // Formatting helpers
  const formatNum = (num: number) => num.toLocaleString('pt-BR');
  const formatTime = (ms: number) => {
    if (ms <= 0) return '0m 0s';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const isHunting = accounts.some(a => a.status === 'hunting');

  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl flex flex-col text-[rgb(var(--text-primary))] shadow-sm overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))]">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isHunting ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-[11px] font-bold tracking-wider text-[rgb(var(--text-muted))]">
            {isHunting ? 'CAÇADA EM ANDAMENTO' : 'CAÇADA PAUSADA'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
            <Clock size={14} />
            {formatTime(stats.totalDurationMs)}
          </span>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {/* Money Block */}
        <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <div className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Dólares por Hora</div>
          <div className="text-2xl font-black text-emerald-500 mb-1">$ {formatNum(dollarsPerHour)}</div>
          <div className="text-[11px] text-[rgb(var(--text-muted))]">Total obtido: $ {formatNum(stats.moneyGained)}</div>
        </div>
        
        {/* EXP Block */}
        <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <div className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">EXP por Hora</div>
          <div className="text-2xl font-black text-amber-500 mb-1">{formatNum(expPerHour)}</div>
          <div className="text-[11px] text-[rgb(var(--text-muted))]">Total recebido: {formatNum(stats.expGained)} EXP</div>
        </div>

        {/* Kills Block */}
        <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
          <div className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Abates por Hora</div>
          <div className="text-2xl font-black text-orange-500 mb-1">{formatNum(Number(killsPerHour))}</div>
          <div className="text-[11px] text-[rgb(var(--text-muted))]">{formatNum(stats.encounters)} monstros derrotados</div>
        </div>
      </div>

      {/* BOTTOM PANELS */}
      <div className="grid grid-cols-2 gap-4 px-4 pb-4">
        
        {/* RESULTADO DA SESSÃO */}
        <div className="border border-[rgb(var(--border))] rounded-lg p-4 bg-[rgb(var(--bg-surface))]">
          <div className="text-[11px] font-bold text-[rgb(var(--accent))] uppercase tracking-widest mb-4">Resultado da Sessão</div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Dólares recebidos</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">$ {formatNum(dollarsReceived)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Valor de venda do loot</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">$ {formatNum(lootSaleValue)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Valor identificado das capturas</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">$ {formatNum(captureValue)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Suprimentos consumidos</span>
              <span className="font-bold text-red-500">-$ {formatNum(suppliesCost)}</span>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[rgb(var(--border))]">
              <div className="flex justify-between items-center bg-[rgb(var(--accent))]/10 border border-[rgb(var(--accent))]/30 p-2.5 rounded text-[13px]">
                <span className="text-[rgb(var(--accent))] font-bold">SALDO ESTIMADO</span>
                <span className="font-black text-[rgb(var(--accent))]">
                  {estimatedBalance >= 0 ? '+' : ''}$ {formatNum(estimatedBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ATIVIDADE */}
        <div className="border border-[rgb(var(--border))] rounded-lg p-4 bg-[rgb(var(--bg-surface))]">
          <div className="text-[11px] font-bold text-[rgb(var(--accent))] uppercase tracking-widest mb-4">Atividade</div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Monstros derrotados</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.encounters)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">EXP do treinador</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.expGained)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">EXP dos Pokémon</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.expGained)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Capturas</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">
                {stats.captures} de {stats.encounters > 0 ? stats.encounters : 0} - 
                {stats.encounters > 0 ? ` ${((stats.captures / stats.encounters) * 100).toFixed(1)}%` : ' 0%'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Pokébolas usadas</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.pokeballsUsed)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Poções usadas</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.potionsUsed)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Shinies vistos</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.shinies)}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[rgb(var(--text-muted))]">Shinies capturados</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{formatNum(stats.shiniesCaught)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
