import React, { useState, useMemo } from 'react';
import { Plus, Trash2, MapPin, Map as MapIcon } from 'lucide-react';
import { DEFAULT_ZONES } from '../../lib/defaultZones';
import { HuntSelectorDialog } from '../HuntSelectorDialog';

interface Route {
  id: string;
  minLevel: number;
  maxLevel: number;
  zoneId: string;
  mapId: number | string;
  name: string;
}

interface RoutePanelProps {
  account: any;
  zones: any[];
  updateAccount: (id: string, partial: any) => void;
}

export function RoutePanel({ account, zones, updateAccount }: RoutePanelProps) {
  const routes = account.routes || [];
  const routesEnabled = account.routesEnabled || false;

  const [minLevel, setMinLevel] = useState('');
  const [maxLevel, setMaxLevel] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const handleAddRoute = () => {
    const min = parseInt(minLevel);
    const max = parseInt(maxLevel);
    
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

    const newRoute: Route = {
      id: Date.now().toString(),
      minLevel: min,
      maxLevel: max,
      zoneId: selectedZone,
      mapId: zoneInfo.map_id || 0,
      name: zoneInfo.name
    };

    updateAccount(account.id, {
      routes: [...routes, newRoute]
    });

    setMinLevel('');
    setMaxLevel('');
    setSelectedZone('');
  };

  const handleRemoveRoute = (id: string) => {
    updateAccount(account.id, {
      routes: routes.filter((r: Route) => r.id !== id)
    });
  };

  const toggleRoutes = () => {
    updateAccount(account.id, {
      routesEnabled: !routesEnabled
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] p-4 text-gray-200">
      
      {/* Header / Toggle */}
      <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800 mb-4 shadow-sm">
        <div>
          <h3 className="font-bold text-gray-100 flex items-center gap-2">
            <MapPin size={16} className="text-emerald-400" />
            Sistema de Rotas Inteligentes
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Altera automaticamente o mapa de caça baseado no nível atual do seu Pokémon Líder.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={routesEnabled}
            onChange={toggleRoutes}
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          <span className="ml-3 text-sm font-medium text-gray-300">
            {routesEnabled ? 'Rotas Ativas' : 'Rotas Inativas'}
          </span>
        </label>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        
        {/* Formulário de Adição */}
        <div className="w-1/2 flex flex-col gap-3 bg-gray-900/40 p-3 rounded-lg border border-gray-800/60 overflow-y-auto">
          <h4 className="font-semibold text-sm text-gray-300 mb-2">Adicionar Nova Rota</h4>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Nível Mínimo</label>
              <input
                type="number"
                min="1"
                value={minLevel}
                onChange={e => setMinLevel(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 text-sm"
                placeholder="Ex: 1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Nível Máximo</label>
              <input
                type="number"
                min="1"
                value={maxLevel}
                onChange={e => setMaxLevel(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 text-sm"
                placeholder="Ex: 10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Zona/Mapa Alvo</label>
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="w-full flex items-center justify-between bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded p-2 text-sm text-left transition-colors"
            >
              <span className={selectedZone ? "text-emerald-400 font-medium" : "text-gray-500"}>
                {selectedZone ? DEFAULT_ZONES.find(z => z.id === selectedZone)?.name : 'Selecionar Mapa...'}
              </span>
              <MapIcon size={14} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1"></div>

          <button
            onClick={handleAddRoute}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <Plus size={16} /> Adicionar Rota
          </button>
        </div>

        {/* Lista de Rotas */}
        <div className="w-1/2 flex flex-col bg-gray-900/40 p-3 rounded-lg border border-gray-800/60">
          <h4 className="font-semibold text-sm text-gray-300 mb-3">Rotas Configuradas ({routes.length})</h4>
          
          <div className="flex-1 overflow-y-auto pr-1">
            {routes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center px-4">
                Nenhuma rota configurada.<br/>Adicione regras de nível ao lado.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Sort by minLevel for display */}
                {[...routes].sort((a,b) => a.minLevel - b.minLevel).map((r: Route) => (
                  <div key={r.id} className="bg-gray-950 border border-gray-800 p-2 rounded flex justify-between items-center group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50"></div>
                    <div className="pl-2">
                      <div className="text-xs font-bold text-gray-400 mb-0.5">Lv {r.minLevel} ➔ Lv {r.maxLevel}</div>
                      <div className="text-sm text-gray-200 font-medium">{r.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">map={r.mapId}</div>
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveRoute(r.id)}
                      className="p-1.5 bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"
                      title="Remover rota"
                    >
                      <Trash2 size={14} />
                    </button>
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
