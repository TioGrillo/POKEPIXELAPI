import { useState, useMemo, useEffect } from 'react';
import { X, Search, Map as MapIcon, LayoutGrid, Compass, Shield, Flame } from 'lucide-react';
import type { Zone } from '../types';

interface Props {
  zones: Zone[];
  currentZoneId: string;
  onSelect: (zoneId: string) => void;
  onClose: () => void;
}

interface SpeciesGroup {
  clean: string;
  name: string;
  dex: number;
  zones: Zone[];
}

export function HuntSelectorDialog({ zones, currentZoneId, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [activeWorld, setActiveWorld] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'map' | 'species'>('map');
  const [dexMap, setDexMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/slug_to_dex.json')
      .then((res) => res.json())
      .then((data) => setDexMap(data))
      .catch(() => {});
  }, []);

  // Agrupa as zonas por "Mundo / Região" para criar as abas dinâmicas
  const worlds = useMemo(() => {
    const set = new Set<string>();
    zones.forEach((z) => {
      if (z.world) set.add(z.world.toLowerCase());
    });
    const list = Array.from(set);
    return ['all', ...list];
  }, [zones]);

  const formatWorldName = (w: string) => {
    if (w === 'all') return 'Todas as Regiões';
    if (w === 'kanto') return 'Kanto';
    if (w === 'johto') return 'Johto';
    if (w === 'legendary') return 'Ilhas Lendárias';
    if (w === '724a5d4c-8f84-487c-88d0-78b16595a2da') return 'Unknown 1';
    if (w === '21fefe70-1856-4086-9489-b9ca79aa0630') return 'Unknown 2';
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

  // Filtragem de zonas por pesquisa e mundo
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      // Filtro por mundo
      if (activeWorld !== 'all' && (z.world || '').toLowerCase() !== activeWorld) {
        return false;
      }
      // Filtro por busca
      if (!search) return true;
      const q = search.toLowerCase();

      const nameMatch = z.name.toLowerCase().includes(q);
      const levelMatch = String(z.min_level).includes(q) || String(z.recommended_level || '').includes(q);
      const encounterMatch = z.encounters?.some((e) => e.species_id.toLowerCase().includes(q));

      return nameMatch || levelMatch || encounterMatch;
    });
  }, [zones, search, activeWorld]);

  // Agrupamento por espécie para a aba secundária "Por Pokémon"
  const [selectedGroup, setSelectedGroup] = useState<SpeciesGroup | null>(null);

  const speciesGroups = useMemo<SpeciesGroup[]>(() => {
    const groupMap: Record<string, SpeciesGroup> = {};

    filteredZones.forEach((z) => {
      const clean = z.name
        .toLowerCase()
        .replace(/^(ca[cç]a\s+d[eo]\s+|zona\s+d[eo]\s+)/g, '')
        .replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, '')
        .replace(/^milch-/, '')
        .trim();

      const dex = dexMap[clean] || dexMap[z.name.toLowerCase()] || 0;

      if (!groupMap[clean]) {
        groupMap[clean] = { clean, name: z.name.replace(/^(ca[cç]a\s+d[eo]\s+|zona\s+d[eo]\s+)/gi, ''), dex, zones: [] };
      }
      groupMap[clean].zones.push(z);
    });

    return Object.values(groupMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredZones, dexMap]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]/50 bg-[rgb(var(--bg-surface))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]">
              <Compass size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[rgb(var(--text-primary))]">
                {selectedGroup ? `Variações de ${selectedGroup.name}` : 'Mapa Pokémon'}
              </h2>
              <p className="text-[11px] text-[rgb(var(--text-muted))]">
                {selectedGroup ? 'Escolha a versão específica para caçar' : 'Navegue pelos mapas, veja os Pokémons disponíveis e escolha o local de caça da conta'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Alternador de Modo de Exibição */}
            {!selectedGroup && (
              <div className="flex bg-[rgb(var(--bg-deep))] p-1 rounded-lg border border-[rgb(var(--border))]">
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'map' ? 'bg-[rgb(var(--accent))] text-white shadow-sm' : 'text-[rgb(var(--text-muted))] hover:text-white'
                  }`}
                >
                  <MapIcon size={14} />
                  Por Mapa
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('species')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'species' ? 'bg-[rgb(var(--accent))] text-white shadow-sm' : 'text-[rgb(var(--text-muted))] hover:text-white'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Por Pokémon
                </button>
              </div>
            )}

            {selectedGroup && (
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--accent))] hover:text-white transition-all cursor-pointer"
              >
                Voltar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-muted))] hover:text-white hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Abas por Região / Cidade e Campo de Busca */}
        {!selectedGroup && (
          <div className="border-b border-[rgb(var(--border))]/50 bg-[rgb(var(--bg-base))] px-6 py-3 space-y-3">
            <div className="flex items-center justify-between gap-4">
              {/* Abas das Cidades / Mundos */}
              <div className="flex gap-2 overflow-x-auto custom-scrollbar py-1">
                {worlds.map((w) => {
                  const count =
                    w === 'all'
                      ? zones.length
                      : zones.filter((z) => (z.world || '').toLowerCase() === w).length;
                  const isActive = activeWorld === w;

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setActiveWorld(w)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-[rgb(var(--accent))] text-white shadow-md'
                          : 'bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-elevated))] hover:text-white border border-[rgb(var(--border))]'
                      }`}
                    >
                      <span>{formatWorldName(w)}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[rgb(var(--bg-deep))] text-[rgb(var(--text-muted))]'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Campo de Busca */}
              <div className="relative w-64 shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar Mapa, Pokémon ou Nível..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-xs text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] shadow-sm transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6 bg-[rgb(var(--bg-deep))] custom-scrollbar">
          {viewMode === 'map' && !selectedGroup ? (
            /* Visualização por Mapa / Zona com Detalhes dos Bichos */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredZones.map((z) => {
                const isSelected = currentZoneId === z.id;
                const encounters = z.encounters || [];

                return (
                  <div
                    key={z.id}
                    onClick={() => {
                      onSelect(z.id);
                      onClose();
                    }}
                    className={`relative group flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]'
                        : 'border-[rgb(var(--border))]/60 bg-[rgb(var(--bg-base))] hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--bg-surface))] hover:-translate-y-0.5 shadow-sm'
                    }`}
                  >
                    {/* Borda superior ativa */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-[rgb(var(--accent))]" />
                    )}

                    <div>
                      {/* Título do Mapa & Nível Recomendado */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-[rgb(var(--accent))] transition-colors">
                            {z.name}
                          </span>
                          <span className="text-[10px] text-[rgb(var(--text-muted))] capitalize">
                            {z.world ? formatWorldName(z.world) : 'Kanto'} • Map #{z.map_id || z.min_level}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="bg-[rgb(var(--accent))] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            Ativo
                          </span>
                        )}
                      </div>

                      {/* Dificuldade e Nível */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <Shield size={10} />
                          Nv. Rec: {z.recommended_level || z.min_level}
                        </span>
                        {z.difficulty && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                            <Flame size={10} />
                            {z.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Lista de Pokémons que aparecem no Mapa */}
                      <div className="space-y-1.5 pt-2 border-t border-[rgb(var(--border))]/40">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] block">
                          Pokémons Disponíveis neste Mapa:
                        </span>
                        
                        <div className="flex flex-wrap gap-2">
                          {encounters.length > 0 ? (
                            encounters.map((enc, idx) => {
                              const sName = enc.species_id;
                              const minL = enc.min_level || z.min_level;
                              const maxL = enc.max_level || minL;
                              const lvlStr = minL === maxL ? `Nv. ${minL}` : `Nv. ${minL}-${maxL}`;

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))]/80 rounded-lg px-2 py-1 shadow-2xs"
                                >
                                  <img
                                    src={`https://pokepixel.nietore.com/assets/imported/creatures/${sName}/front.png`}
                                    alt={sName}
                                    className="w-6 h-6 object-contain pixelated"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-white capitalize leading-tight">
                                      {sName}
                                    </span>
                                    <span className="text-[8px] font-bold text-amber-400">
                                      {lvlStr}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            /* Fallback caso encounters não esteja populado no JSON */
                            <div className="flex items-center gap-1.5 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg px-2 py-1">
                              <img
                                src={`https://pokepixel.nietore.com/assets/imported/creatures/${z.name.toLowerCase().replace(/^(ca[cç]a\s+d[eo]\s+|zona\s+d[eo]\s+)/g, '').trim()}/front.png`}
                                className="w-6 h-6 object-contain pixelated"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="text-[10px] font-bold text-white capitalize">
                                {z.name.replace(/^(ca[cç]a\s+d[eo]\s+|zona\s+d[eo]\s+)/gi, '')}
                              </span>
                              <span className="text-[8px] font-bold text-amber-400">
                                Nv. {z.min_level}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Visualização por Pokémon (Agrupado por Espécie) */
            !selectedGroup ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {speciesGroups.map((g) => {
                  const isSelected = g.zones.some((z) => z.id === currentZoneId);

                  return (
                    <button
                      key={g.clean}
                      type="button"
                      onClick={() => {
                        if (g.zones.length === 1) {
                          onSelect(g.zones[0].id);
                          onClose();
                        } else {
                          setSelectedGroup(g);
                        }
                      }}
                      className={`relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]'
                          : 'border-[rgb(var(--border))]/60 bg-[rgb(var(--bg-base))] hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/80 hover:-translate-y-0.5 shadow-sm'
                      }`}
                    >
                      <div className="relative w-14 h-14 flex items-center justify-center mb-2">
                        {g.dex > 0 ? (
                          <img
                            src={`https://pokepixel.nietore.com/assets/imported/creatures/${g.clean}/front.png`}
                            alt={g.name}
                            className="w-12 h-12 object-contain drop-shadow-md z-10 transition-transform group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${g.dex}.gif`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[rgb(var(--bg-elevated))] flex items-center justify-center text-[10px] text-[rgb(var(--text-muted))]">
                            ?
                          </div>
                        )}
                        {g.zones.length > 1 && (
                          <div className="absolute -top-1 -right-1 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-[9px] font-bold px-1.5 py-0.5 rounded-md text-[rgb(var(--text-secondary))] z-20">
                            {g.zones.length}
                          </div>
                        )}
                      </div>

                      <span className="text-[12px] font-bold text-[rgb(var(--text-primary))] text-center capitalize leading-tight z-10">
                        {g.name}
                      </span>

                      <div className="flex items-center gap-1.5 mt-2 z-10">
                        {g.zones.length === 1 ? (
                          <span className="text-[10px] px-2 py-0.5 font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Nv. {g.zones[0].min_level ?? 1}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Múltiplas Zonas
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Variações de uma espécie */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selectedGroup.zones
                  .sort((a, b) => a.min_level - b.min_level)
                  .map((z) => {
                    const isSelected = currentZoneId === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          onSelect(z.id);
                          onClose();
                        }}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)]'
                            : 'border-[rgb(var(--border))]/60 bg-[rgb(var(--bg-base))] hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--bg-surface))] hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                          {selectedGroup.dex > 0 ? (
                            <img
                              src={`https://pokepixel.nietore.com/assets/imported/creatures/${selectedGroup.clean}/front.png`}
                              alt={z.name}
                              className="w-16 h-16 object-contain drop-shadow-md transition-transform group-hover:scale-110"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${selectedGroup.dex}.gif`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[rgb(var(--bg-elevated))] flex items-center justify-center text-[10px] text-[rgb(var(--text-muted))]">
                              ?
                            </div>
                          )}
                        </div>
                        <span className="text-[13px] font-bold text-[rgb(var(--text-primary))] text-center mb-2">
                          {z.name}
                        </span>
                        <span className="text-[11px] px-2.5 py-1 font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Nv. {z.min_level ?? 1}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )
          )}

          {filteredZones.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-[rgb(var(--text-muted))] opacity-60">
              <Search size={32} className="mb-3" />
              <p className="text-[14px] font-medium">Nenhum mapa ou Pokémon encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
