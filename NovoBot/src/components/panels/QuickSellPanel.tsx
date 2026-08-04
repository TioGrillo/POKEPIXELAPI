import { useState, useMemo } from 'react';
import { LayoutGrid, List, CheckSquare, Square, DollarSign, Search, PackageCheck, Package } from 'lucide-react';
import axios from 'axios';
import type { Account } from '../../types';

interface QuickSellPanelProps {
  account: Account;
  onRefreshInventory: () => void;
  pushLog: (msg: string) => void;
}

const GAME_URL = 'https://pokepixel.nietore.com/api/v1';

// Mapeamento extensivo de fallback para PokéAPI Sprites
const POKEAPI_ITEM_MAP: Record<string, string> = {
  // Pokébolas
  'capsule_basic': 'poke-ball',
  'capsule_great': 'great-ball',
  'great_ball': 'great-ball',
  'capsule_ultra': 'ultra-ball',
  'ultra_ball': 'ultra-ball',
  'capsule_master': 'master-ball',
  'master_ball': 'master-ball',
  'capsule_super': 'super-ball',
  'super_ball': 'super-ball',
  'earth_ball': 'heavy-ball',

  // Poções e Revives
  'potion': 'potion',
  'potion_super': 'super-potion',
  'super_potion': 'super-potion',
  'potion_hyper': 'hyper-potion',
  'hyper_potion': 'hyper-potion',
  'potion_ultra': 'max-potion',
  'ultra_potion': 'max-potion',
  'potion_max': 'max-potion',
  'great_potion': 'super-potion',
  'revive_minor': 'revive',
  'minor_revive': 'revive',
  'revive': 'revive',
  'max_revive': 'max-revive',

  // Ferramentas e Iscas
  '310': 'old-rod',
  '311': 'bait',

  // Pedras e Loots Especiais
  'fire_tail': 'fire-stone',
  'essence_of_fire': 'fire-gem',
  'ice_orb': 'never-melt-ice',
  'piece_of_diglett': 'soft-sand',
  'pot_of_lava': 'magmarizer',
  'sandbag': 'soft-sand',
  'snowball': 'snowball',
  'strange_pheromone': 'honey',
  'straw': 'miracle-seed',
  'cocoon_stone': 'leaf-stone',
  'shadow_stone': 'dusk-stone',
  'crystal_stone': 'shiny-stone',
  'heart_stone': 'sweet-heart',
  'fire_stone': 'fire-stone',
  'water_stone': 'water-stone',
  'leaf_stone': 'leaf-stone',
  'thunder_stone': 'thunder-stone',
  'moon_stone': 'moon-stone',
  'sun_stone': 'sun-stone',
  'dusk_stone': 'dusk-stone',
  'dawn_stone': 'dawn-stone',
  'shiny_stone': 'shiny-stone',
  'ice_stone': 'ice-stone'
};

const POKEAPI_NAME_MAP: Record<string, string> = {
  'isca': 'honey',
  'talismã de captura': 'spell-tag',
  'talismã de captura shiny': 'shiny-charm',
  'elixir de exp pokémon': 'exp-share',
  'elixir de exp pokemon': 'exp-share',
  'incenso shiny': 'odd-incense',
  'elixir de exp do treinador': 'exp-candy-xl',
  'small potion': 'potion',
  'great potion': 'super-potion',
  'peixe fresco': 'mystic-water',
  'insígnia': 'nugget',
  'insignia': 'nugget',
  'earth ball': 'heavy-ball',
  'small stone': 'hard-stone',
  'revive': 'revive',
  'pixel ball': 'premier-ball'
};

export function ItemImage({ itemId, itemName, className = "w-10 h-10" }: { itemId: string; itemName?: string; className?: string }) {
  const [srcIndex, setSrcIndex] = useState(0);

  const normalizedName = (itemName || '').toLowerCase().trim();
  const pokeApiSlug = POKEAPI_NAME_MAP[normalizedName] || POKEAPI_ITEM_MAP[itemId] || itemId.replace(/_/g, '-');

  const sources = useMemo(() => {
    return [
      `https://pokepixel.nietore.com/assets/items/${itemId}.png`,
      `https://pokepixel.nietore.com/assets/imported/items/${itemId}.png`,
      `https://pokepixel.nietore.com/img/items/${itemId}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${pokeApiSlug}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemId}.png`
    ];
  }, [itemId, pokeApiSlug]);

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex((prev) => prev + 1);
    } else {
      setSrcIndex(-1); // Exibe fallback com ícone SVG estilizado
    }
  };

  if (srcIndex === -1) {
    return (
      <div className={`${className} flex items-center justify-center bg-[rgb(var(--bg-deep))] rounded-lg border border-[rgb(var(--border))] text-amber-400 font-bold text-xs p-1 shadow-inner`} title={itemName || itemId}>
        <Package size={18} />
      </div>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={itemName || itemId}
      className={`${className} object-contain pixelated drop-shadow-sm`}
      onError={handleError}
    />
  );
}

export function QuickSellPanel({ account, onRefreshInventory, pushLog }: QuickSellPanelProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSelling, setIsSelling] = useState(false);

  const inventory = account.inventory || [];

  // Itens elegíveis para venda
  const sellableItems = useMemo(() => {
    return inventory.filter((item: any) => {
      const qty = item.quantity || item.qty || item.market_sellable_qty || 0;
      const hasQty = qty > 0;
      const isCollectible = item.category === 'collectible' || item.type === 'collectible' || item.can_sell === true || (item.sell_price || 0) > 0;
      
      if (!hasQty) return false;
      if (!search) return isCollectible;
      
      const q = search.toLowerCase();
      const nameMatch = (item.name || item.item_id || '').toLowerCase().includes(q);
      return isCollectible && nameMatch;
    });
  }, [inventory, search]);

  const toggleSelect = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.size === sellableItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(sellableItems.map((i: any) => i.item_id)));
    }
  };

  const executeSell = async (itemsToSell: Array<{ item_id: string; qty: number }>) => {
    if (itemsToSell.length === 0 || !account.token) return;
    setIsSelling(true);

    try {
      pushLog(`💰 Enviando requisição de venda para ${itemsToSell.length} tipo(s) de item...`);

      const res = await axios.post(
        `${GAME_URL}/shop/sell/items`,
        { items: itemsToSell },
        {
          headers: { Authorization: `Bearer ${account.token}` },
          validateStatus: () => true,
        }
      );

      if (res.status === 200 || res.status === 201) {
        pushLog(`✅ Venda realizada com SUCESSO!`);
        setSelectedItemIds(new Set());
        onRefreshInventory();
      } else {
        pushLog(`❌ Falha ao vender itens: HTTP ${res.status} - ${JSON.stringify(res.data)}`);
      }
    } catch (err: any) {
      pushLog(`❌ Erro de rede ao vender: ${err.message}`);
    } finally {
      setIsSelling(false);
    }
  };

  const handleSellSelected = () => {
    const items = sellableItems
      .filter((i: any) => selectedItemIds.has(i.item_id))
      .map((i: any) => ({
        item_id: i.item_id,
        qty: i.sellable_qty || i.quantity || i.qty || 1,
      }));
    executeSell(items);
  };

  const handleSellAll = () => {
    const items = sellableItems.map((i: any) => ({
      item_id: i.item_id,
      qty: i.sellable_qty || i.quantity || i.qty || 1,
    }));
    executeSell(items);
  };

  const handleSellSingle = (item: any) => {
    const qty = item.sellable_qty || item.quantity || item.qty || 1;
    executeSell([{ item_id: item.item_id, qty }]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Ações Superiores */}
      <div className="bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-xs font-semibold text-white hover:border-blue-500 transition-all cursor-pointer"
          >
            {selectedItemIds.size > 0 && selectedItemIds.size === sellableItems.length ? (
              <CheckSquare size={16} className="text-blue-400" />
            ) : (
              <Square size={16} className="text-[rgb(var(--text-muted))]" />
            )}
            <span>Selecionar Todos ({sellableItems.length})</span>
          </button>

          {selectedItemIds.size > 0 && (
            <button
              type="button"
              disabled={isSelling}
              onClick={handleSellSelected}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <DollarSign size={15} />
              Vender Selecionados ({selectedItemIds.size})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Busca por item */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar loot..."
              className="pl-8 pr-3 py-1.5 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg text-xs text-white placeholder-[rgb(var(--text-faint))] outline-none focus:border-green-500 w-36 sm:w-44"
            />
          </div>

          {/* Alternador de Modo de Exibição */}
          <div className="flex bg-[rgb(var(--bg-deep))] p-1 rounded-lg border border-[rgb(var(--border))]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-[rgb(var(--accent))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-white'
              }`}
              title="Modo Grade"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-[rgb(var(--accent))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-white'
              }`}
              title="Modo Lista"
            >
              <List size={15} />
            </button>
          </div>

          {/* Botão Vender Tudo */}
          <button
            type="button"
            disabled={isSelling || sellableItems.length === 0}
            onClick={handleSellAll}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ml-auto"
          >
            <PackageCheck size={15} />
            Vender Tudo
          </button>
        </div>
      </div>

      {/* Conteúdo dos Itens (Grade ou Lista) */}
      {sellableItems.length === 0 ? (
        <div className="text-[12px] text-[rgb(var(--text-muted))] text-center py-10 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl">
          Nenhum loot vendável encontrado no inventário.
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUALIZAÇÃO EM GRADE */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sellableItems.map((item: any, idx: number) => {
            const isSelected = selectedItemIds.has(item.item_id);
            const qty = item.quantity || item.qty || 1;
            const price = item.sell_price || 0;

            return (
              <div
                key={idx}
                className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-md'
                    : 'border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--accent))]'
                }`}
              >
                {/* Checkbox de Seleção no Canto */}
                <button
                  type="button"
                  onClick={() => toggleSelect(item.item_id)}
                  className="absolute top-2.5 left-2.5 text-[rgb(var(--text-muted))] hover:text-white cursor-pointer z-10"
                >
                  {isSelected ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                </button>

                {/* Imagem do Item */}
                <div className="flex flex-col items-center my-2">
                  <div className="w-14 h-14 flex items-center justify-center bg-[rgb(var(--bg-deep))] rounded-lg p-2 mb-2 shadow-inner border border-[rgb(var(--border))]/40">
                    <ItemImage itemId={item.item_id} itemName={item.name} className="w-10 h-10" />
                  </div>
                  <span className="text-[12px] font-bold text-white text-center leading-tight truncate w-full">
                    {item.name || item.item_id}
                  </span>
                  <span className="text-[10px] text-green-400 font-semibold mt-0.5">
                    ${price} / un
                  </span>
                </div>

                {/* Quantidade & Botão de Vender Individual */}
                <div className="pt-2 border-t border-[rgb(var(--border))]/50 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-blue-400 font-mono">
                    {qty}x
                  </span>
                  <button
                    type="button"
                    disabled={isSelling}
                    onClick={() => handleSellSingle(item)}
                    className="px-2.5 py-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/40 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Vender
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM LISTA */
        <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl overflow-hidden divide-y divide-[rgb(var(--border))]/50 shadow-md">
          {sellableItems.map((item: any, idx: number) => {
            const isSelected = selectedItemIds.has(item.item_id);
            const qty = item.quantity || item.qty || 1;
            const price = item.sell_price || 0;
            const totalPrice = price * qty;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 transition-colors ${
                  isSelected ? 'bg-blue-500/10' : 'hover:bg-[rgb(var(--bg-deep))]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelect(item.item_id)}
                    className="text-[rgb(var(--text-muted))] hover:text-white cursor-pointer"
                  >
                    {isSelected ? <CheckSquare size={18} className="text-blue-400" /> : <Square size={18} />}
                  </button>

                  <div className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--bg-deep))] rounded-lg p-1.5 border border-[rgb(var(--border))]">
                    <ItemImage itemId={item.item_id} itemName={item.name} className="w-8 h-8" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-white capitalize">{item.name || item.item_id}</span>
                    <span className="text-[10px] text-[rgb(var(--text-muted))] capitalize">
                      {item.rarity || 'comum'} • {item.type || 'loot'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col text-right">
                    <span className="text-[12px] font-bold text-blue-400 font-mono">{qty}x</span>
                    <span className="text-[10px] text-green-400 font-semibold">
                      ${price} / un ({totalPrice > 0 ? `$${totalPrice} total` : ''})
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSelling}
                    onClick={() => handleSellSingle(item)}
                    className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Vender
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
