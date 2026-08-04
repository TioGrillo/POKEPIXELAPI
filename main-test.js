const { app } = require('electron');
const { BotSession } = require('./dist/bot/engine.js');

const EMAIL = "damdam5";
const PASSWORD = "Vd522431";

app.whenReady().then(async () => {
  // Build AccountConfig — inclui email e password para relogin automático
  const cfg = {
    name: EMAIL,
    email: EMAIL,
    password: PASSWORD,
    token: "", // será preenchido via relogin
    hunt: "hunt_abra",
    enabled: true,
    sell_loot_every_kills: 200,
    buy_balls: false,
    buy_balls_min_gold: 9999999,
    auto_evolve: false,
    auto_sleep: false,
    auto_tasks: false,
    auto_battlepass: false,
    ball_rules: [],
    auto_buy_max: false,
    auto_buy_max_ball_id: 0,
    route_enabled: false,
    route_continue_infinite: false,
    route_obey_always: false,
    route_rules: [],
    auto_claim_battlepass: false,
    auto_potion: false,
    auto_potion_pct: 80,
    auto_revive: false,
    auto_sell_loot: false,
    sell_pokemon: false,
    sell_config: {
      sell_categories: ["loot"],
      catch_ball_id: 4,
      shiny_ball_id: 5,
      auto_catch: false,
    },
  };

  const engine = new BotSession(cfg);

  engine.on("log", (msg) => {
    // msg.msg já tem o formato completo [HH:MM:SS] [conta] [LEVEL] texto
    console.log(msg.msg || JSON.stringify(msg));
  });

  engine.on("stats", (stats) => {
    if (stats.kills > 0 || stats.inHunt) {
      console.log(`[STATS] InHunt=${stats.inHunt} | Kills=${stats.kills} | Captures=${stats.captures} | XP/h=${stats.xph} | Kills/h=${stats.kph}`);
    }
  });

  engine.on("capture-log", (data) => {
    const pk = data.pk || {};
    console.log(`[CAPTURE] ${pk.speciesName || pk.name || JSON.stringify(pk)}`);
  });

  console.log("[TESTE] Iniciando engine...");
  engine.start();

  // Iniciar hunt após 5s (dá tempo pro relogin + WS conectar)
  setTimeout(async () => {
    console.log("[TESTE] Iniciando hunt_abra via startHunt()...");
    await engine.startHunt("hunt_abra");
  }, 5000);

  // Parar após 60 segundos e mostrar resultado
  setTimeout(() => {
    const s = engine.stats();
    console.log(`\n===== RESULTADO FINAL =====`);
    console.log(`Kills registradas: ${engine.kills}`);
    console.log(`Capturas: ${engine.captures}`);
    console.log(`XP/hora: ${s.xph}`);
    console.log(`Gold/hora: ${s.gph}`);
    console.log(`Kills/hora: ${s.kph}`);
    console.log(`===========================\n`);
    app.exit(0);
  }, 60000);
});
