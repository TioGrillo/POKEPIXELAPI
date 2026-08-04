# PokeIdleBot-Web - Historico de Desenvolvimento

## Visao Geral

Migracao completa do **PokeIdleBot** (Python/PyQt6) para **PokeIdleBot-Web** (Electron + React + TypeScript + Tailwind CSS).

- **Stack**: Electron 35, React 19, Vite 6, Tailwind CSS 3.4, Zustand, lucide-react
- **Diretorio**: `D:\PROJETOS AT\a\PokeIdleBot-Web`
- **Original**: `D:\PROJETOS AT\a\PokeIdleBot` (Python bot ~12.000 linhas)

---

## 1. Migracao da Interface

### Layout Principal
- **Titlebar**: Controles de janela frameless (minimizar, maximizar, fechar) com icones lucide-react
- **Sidebar**: Lista de contas com indicadores Wifi/WifiOff, nivel, botao de remover (X), contagem de ativas
- **Tab Bar**: 4 abas principais — Conta, Painel Geral, Log, Controle

### Sidebar
- Botao "Adicionar Conta" com icone Plus
- Botoes "Iniciar Todas" / "Parar Todas"
- Lista de contas com icones de conexao e nivel
- Barra inferior com **Importar**, **Exportar** e **Configuracoes**

### Pagina de Conta (AccountPage)
- Layout 2 colunas (Config+Hunt+Rotas+BallRules | Stats+Filtro+Bolas+Cassino)
- Exibicao do time Pokemon com sprites animados
- Session Analyzer com 8 metricas (Kills/h, Tempo, XP/h, Capturados, Loot, Supply, Saldo, Bolas)
- Loot & Drops com tabela de sessao
- Log da conta com MultiLogView

### Painel Geral (GlobalPanel)
- Grid de 8 cards de resumo com icones (Kills, Capturas, Shiny, Gold, XP, Uptime, Conectados, Parados)
- Tabela por conta com barras de HP

### Log (LogPanel)
- 3 colunas: Multi-log + Lista de capturas + Ranking por kills
- Filtro por conta, busca, niveis de log coloridos

### Controle (ControlPanel)
- 6 sub-abas:
  - **Acoes Rapidas**: start-hunt, stop-hunt, connect, sell-loot, claim-*/start-fishing
  - **Reroll**: Casino automatico com selecao de speciesId
  - **Rotas e Montadas**: CRUD completo com regras
  - **Ajustes**: Toggle switches (auto-potion, revive, catch, sell, keep-shiny)
  - **Profissoes**: set-profession, rankup-profession
  - **Mercado/Itens**: Inventario por conta, listings do marketplace

---

## 2. Dialogos e Modais

### AddAccountDialog
- Campos: Nome + Token JWT + Hunt selector
- Hunt selector com grid de sprites animados, busca e filtro por area
- **Fix**: Corrigido `getSpriteUrl(hunt)` que faltava o parametro `dexMap` (causava tela em branco)

### HuntSelector
- Grid com sprites animados (PokeAPI Gen V BW)
- Filtro por area (Kanto, Johto, Outland, Orre, Nightmare)
- Busca por nome

### PokemonSelector
- Grid 6 colunas, Pokemon Gen 1-2 (251 max)
- Busca por nome ou numero

### SettingsDialog (por conta)
- 5 abas: Geral, Bolas, Venda, Auto, Rotas
- Todos os campos do bot original (hunt, proxy, sell config, ball config, route rules)

### GlobalSettingsDialog
- 3 abas: **Temas**, **Geral**, **Backup**
- **Temas**: 12 presets com preview ao vivo (2 escuros + 10 tinted)
- **Geral**: Proxy padrao, perfil molde para novas contas
- **Backup**: Exportar/Importar contas com modo merge/substituir

---

## 3. Sistema de Temas (Avancado)

### Arquivo: `src/renderer/src/lib/themes.ts`

12 temas com paletas completas de cores:

| Tema | Categoria | Cor Destaque |
|------|-----------|--------------|
| Meia-Noite | Escuro | Amber |
| Ardósia | Escuro | Cinza |
| Oceano | Tons | Azul |
| Floresta | Tons | Verde |
| Violeta | Tons | Roxo |
| Carmesim | Tons | Vermelho |
| Ambra | Tons | Amber |
| Esmeralda | Tons | VerdeEscuro |
| Rosa | Tons | Rosa |
| Ciano | Tons | Ciano |
| Por do Sol | Tons | Laranja |
| Magenta | Tons | Magenta |

### Variaveis CSS (todas mudam com o tema)
- `--accent`, `--accent-light`, `--accent-dark`
- `--bg-deep`, `--bg-base`, `--bg-surface`, `--bg-elevated`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`
- `--border`, `--success`, `--warning`, `--danger`

### Funcionalidades
- `applyTheme(theme)` — Aplica todas as variaveis CSS de uma vez
- `applyCustomAccent(hex)` — Aplica cor personalizada + gera backgrounds tinted
- `mixHex()` — Mistura cores para criar backgrounds tinted com a cor do tema
- Preview ao vivo no dialog de configuracoes
- Tema salvo via electron-store e restaurado ao iniciar

---

## 4. Motor do Bot (engine.ts)

### Metodos implementados (25+)
- `startHunt`, `stopHunt`
- `sellLootFiltered`, `sellPokemonFiltered`
- `buyItem`, `buyMax`
- `claimStreak`, `claimGifts`, `claimBattlepass`, `claimPokedex`, `claimTasks`, `claimAll`
- `casinoReroll`
- `setProfession`, `rankupProfession`
- `equipPokemon`, `lockPokemon`
- `getInventory`, `getShopItems`, `getListings`
- `marketListItem`, `marketMakeOffer`, `marketAcceptOffer`
- `startFishing`

### HTTP (Node.js)
- `httpGet` e `httpPost` usando `child_process.execSync` + `curl` (sincrono)
- Headers de spoofing (User-Agent, X-Forwarded-For, Referer)

---

## 5. IPC Handlers (main/index.ts)

### Contas
- `accounts:list` — Lista todas as contas
- `accounts:save` — Salva lista de contas
- `accounts:export` — Exporta para JSON (dialogo nativo de salvar)
- `accounts:import` — Importa de JSON (merge ou substituir)

### Bot
- `bot:start`, `bot:stop`, `bot:start-all`, `bot:stop-all`
- `bot:status`, `bot:connect`
- `bot:start-hunt`, `bot:stop-hunt`
- `bot:sell-loot`, `bot:sell-pokemon`
- `bot:buy-item`, `bot:buy-max`
- `bot:claim-streak`, `bot:claim-gifts`, `bot:claim-bp`, `bot:claim-all`
- `bot:start-fishing`, `bot:casino-reroll`
- `bot:set-profession`, `bot:rankup-profession`
- `bot:equip-pokemon`, `bot:lock-pokemon`
- `bot:get-inventory`, `bot:get-shop`, `bot:get-listings`
- `bot:market-list`, `bot:market-offer`, `bot:market-accept`

### Rotas e Config
- `mounted-routes:list`, `mounted-routes:save`
- `settings:get`, `settings:set`

---

## 6. Correcoes de Bugs

| Bug | Causa | Correcao |
|-----|-------|----------|
| Tela em branco ao clicar conta | `BarChart3` nao importado de lucide-react | Adicionado ao import |
| Engine nao fazia HTTP | `XMLHttpRequest` nao existe no Node.js | Substituido por `curl` via `execSync` |
| Metodos duplicados | `httpPost` definido 2 vezes | Removido duplicata |
| `require()` no renderer | Vite ESM nao suporta `require` | Substituido por `loadJSON()` async com `fetch()` |
| Dados nao encontrados no prod | Arquivos JSON nao copiados para dist | Adicionado copy no `npm.bat` |
| `npm.bat` com npx | `npx` falha em contexto batch | Alterado para `node ./node_modules/...` |
| AddAccountDialog em branco | `getSpriteUrl(hunt)` sem `dexMap` | Adicionado segundo parametro |
| Tema so muda accent | `applyTheme` so setava `--accent` | Criado sistema completo com todas as variaveis |

---

## 7. Arquitetura de Arquivos

```
src/
├── main/
│   └── index.ts              # Electron main process (IPC, store, janela)
├── preload/
│   └── index.ts              # Bridge main<->renderer
├── bot/
│   └── engine.ts             # Motor do bot (BotSession, HTTP, game logic)
├── shared/
│   ├── types.ts              # AccountConfig, BotStats, RouteRule, etc.
│   ├── hunts_data.json       # 245 hunts
│   ├── slug_to_dex.json      # Mapeamento slug -> numero Pokedex
│   └── poke_base_stats.json  # Stats base de 251 Pokemon
└── renderer/src/
    ├── App.tsx               # Layout principal
    ├── index.css             # Variaveis CSS e estilos base
    ├── types/index.ts        # Tipos duplicados do renderer
    ├── stores/botStore.ts    # Zustand store (stats, logs)
    ├── lib/
    │   ├── ipc.ts            # Wrappers de invoke/send/on
    │   ├── utils.ts          # cn, formatUptime, formatNumber
    │   ├── dataLoader.ts     # loadJSON async com cache
    │   └── themes.ts         # Sistema de temas (12 presets)
    └── components/
        ├── layout/
        │   ├── Titlebar.tsx   # Barra de titulo frameless
        │   ├── Sidebar.tsx    # Lista de contas + botoes
        │   └── AccountPage.tsx # Pagina detalhada da conta
        ├── panels/
        │   ├── GlobalPanel.tsx  # Dashboard geral
        │   ├── LogPanel.tsx     # Log unificado
        │   ├── ControlPanel.tsx # Controle em massa
        │   └── MultiLogView.tsx # Componente de log reutilizavel
        └── ui/
            ├── AddAccountDialog.tsx    # Dialogo de adicionar conta
            ├── HuntSelector.tsx        # Seletor de hunt com sprites
            ├── PokemonSelector.tsx     # Seletor de Pokemon
            ├── SettingsDialog.tsx      # Config por conta (5 abas)
            ├── GlobalSettingsDialog.tsx # Config geral (temas, backup)
            └── LootTable.tsx           # Tabela de drops da sessao
```

---

## 8. Build

### npm.bat
```bat
[1/3] Buildando main...     -> tsc -p tsconfig.main.json
[2/3] Buildando preload...  -> tsc -p tsconfig.preload.json
[3/3] Buildando renderer... -> vite build
Copiando dados compartilhados para dist/renderer...
```

### Comando manual
```powershell
Remove-Item -Path dist -Recurse -Force
node ./node_modules/typescript/bin/tsc -p tsconfig.main.json
node ./node_modules/typescript/bin/tsc -p tsconfig.preload.json
node ./node_modules/vite/bin/vite.js build
# + copiar JSONs para dist/renderer/
```

---

## 9. Dependencias

### Electron + Build
- `electron` 35
- `vite` 6.4
- `typescript` 5.x
- `tailwindcss` 3.4
- `postcss` + `autoprefixer`

### UI
- `react` 19
- `lucide-react` (icones — zero emojis na UI)
- `zustand` (estado global)
- `electron-store` (persistencia)

### Dados
- PokeAPI sprites (GitHub raw)
  - Animados: `generation-v/black-white/animated/{dex}.gif`
  - Fallback: `sprites/pokemon/{dex}.png`
