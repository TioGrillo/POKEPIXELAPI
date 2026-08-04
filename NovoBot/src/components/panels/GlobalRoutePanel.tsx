import React, { useState, useMemo } from 'react';
import type { GlobalRoute } from '../../types';
import { Plus, Trash2, MapPin, Map as MapIcon, Search } from 'lucide-react';
import { DEFAULT_ZONES } from '../../lib/defaultZones';
import { HuntSelectorDialog } from '../HuntSelectorDialog';

interface GlobalRoutePanelProps {
  globalRoutes: GlobalRoute[];
  zones: any[];
  setGlobalRoutes: (routes: GlobalRoute[]) => void;
}

export function GlobalRoutePanel({ globalRoutes, zones, setGlobalRoutes }: GlobalRoutePanelProps) {
  const [speciesId, setSpeciesId] = useState('');
  const [minLevel, setMinLevel] = useState('');
  const [maxLevel, setMaxLevel] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const handleAddRoute = () => {
    const min = parseInt(minLevel);
    const max = parseInt(maxLevel);
    const species = speciesId.trim().toLowerCase();
    
    if (!species) {
      alert("Digite o nome ou ID do Pokémon (ex: pikachu)");
      return;
    }

    if (isNaN(min) || isNaN(max) || min < 1 || max < 1 || min > max) {
      alert("Níveis inválidos. O min e max devem ser números e min <= max.");
      return;
    }

    if (!selectedZone) {
      alert("Selecione uma zona para esta rota.");
      return;
    }

    const zoneInfo = zones.find(z => z.id === selectedZone);
    if (!zoneInfo) return;

    const newRoute: GlobalRoute = {
      id: Date.now().toString(),
      speciesId: species,
      minLevel: min,
      maxLevel: max,
      zoneId: selectedZone,
      mapId: zoneInfo.map_id || 0,
      name: zoneInfo.name
    };

    setGlobalRoutes([...globalRoutes, newRoute]);

    setSpeciesId('');
    setMinLevel('');
    setMaxLevel('');
    setSelectedZone('');
  };

  const handleRemoveRoute = (id: string) => {
    setGlobalRoutes(globalRoutes.filter(r => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] p-6 text-gray-200">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg border border-gray-800 mb-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-400" />
            Rotas Montadas (Globais)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Essas rotas são baseadas na ESPÉCIE do Pokémon Líder. Elas têm prioridade máxima.
            Se uma conta estiver caçando com um Pokémon que bate com uma destas regras, o bot ignorará as rotas individuais e usará a Rota Montada.
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        
        {/* Formulário de Adição */}
        <div className="w-1/3 flex flex-col gap-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/60 overflow-y-auto">
          <h4 className="font-semibold text-md text-gray-300 mb-2 border-b border-gray-800 pb-2">Nova Rota Global</h4>
          
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Espécie do Pokémon</label>
            <input
              type="text"
              value={speciesId}
              onChange={e => setSpeciesId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="ex: charizard, pidgey..."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Nível Mín</label>
              <input
                type="number"
                min="1"
                value={minLevel}
                onChange={e => setMinLevel(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="Ex: 1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Nível Máx</label>
              <input
                type="number"
                min="1"
                value={maxLevel}
                onChange={e => setMaxLevel(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="Ex: 100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Zona / Mapa Alvo</label>
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="w-full flex items-center justify-between bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-left transition-colors shadow-inner"
            >
              <span className={selectedZone ? "text-emerald-400 font-medium" : "text-gray-500"}>
                {selectedZone ? zones.find(z => z.id === selectedZone)?.name : 'Clique para selecionar...'}
              </span>
              <MapIcon size={16} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1"></div>

          <button
            onClick={handleAddRoute}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] mt-4"
          >
            <Plus size={18} /> Cadastrar Rota Global
          </button>
        </div>

        {/* Lista de Rotas */}
        <div className="flex-1 flex flex-col bg-gray-900/40 p-4 rounded-xl border border-gray-800/60">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
            <h4 className="font-semibold text-md text-gray-300">Rotas Montadas Ativas ({globalRoutes.length})</h4>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {globalRoutes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center px-4">
                <MapPin size={48} className="mb-4 opacity-20" />
                <p>Nenhuma rota global configurada.</p>
                <p className="text-xs mt-2 opacity-70">Adicione regras ao lado para que suas contas sigam rotas específicas por Pokémon automaticamente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...globalRoutes].sort((a,b) => a.speciesId.localeCompare(b.speciesId) || a.minLevel - b.minLevel).map((r) => (
                  <div key={r.id} className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex flex-col relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors"></div>
                    
                    <div className="pl-3 flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://pokepixel.nietore.com/assets/imported/creatures/${r.speciesId}/front.png`} 
                          alt={r.speciesId}
                          className="w-10 h-10 object-contain pixelated drop-shadow-md"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-0.5">{r.speciesId}</div>
                          <div className="text-sm font-bold text-emerald-400">Nv {r.minLevel} ➔ Nv {r.maxLevel}</div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleRemoveRoute(r.id)}
                        className="p-2 bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remover rota global"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-800/50 pl-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Caçar em:</div>
                      <div className="text-sm text-gray-200 font-medium truncate" title={r.name}>{r.name}</div>
                      <div className="text-[10px] text-emerald-500/70 font-mono">map_id: {r.mapId}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {showSelector && (
        <HuntSelectorDialog
          zones={zones}
          currentZoneId={selectedZone}
          onSelect={(id) => setSelectedZone(id)}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
