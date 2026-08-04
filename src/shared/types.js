"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SELL_CONFIG = void 0;
exports.createDefaultAccount = createDefaultAccount;
exports.DEFAULT_SELL_CONFIG = {
    auto_catch: true,
    keep_shiny: true,
    best_shiny_ball: false,
    best_cball: false,
    max_cball_id: 5,
    catch_ball_id: 4,
    shiny_ball_id: 5,
    sell_categories: ["loot"],
    sell_pokemon: false,
    sell_pokemon_every_catches: 100,
    min_score_keep: 50,
    keep_lendaria: true,
    keep_epica: true,
    keep_rara: true,
    keep_incomum: false,
    keep_comum: false,
    use_safari_ball: false,
    min_iv_atk: 0,
    min_iv_speed: 0,
    auto_revive: true,
    keep_min_rarity: "rare",
};
function createDefaultAccount(name, token, hunt) {
    return {
        name,
        token,
        hunt,
        enabled: true,
        sell_loot_every_kills: 50,
        buy_balls: false,
        buy_balls_min_gold: 10000,
        sell_config: { ...exports.DEFAULT_SELL_CONFIG },
        auto_tasks: false,
        auto_battlepass: false,
        ball_rules: [],
        auto_buy_max: false,
        auto_buy_max_ball_id: 4,
        route_enabled: false,
        route_continue_infinite: false,
        route_rules: [],
        auto_claim_battlepass: false,
        auto_potion: false,
        auto_potion_pct: 30,
        auto_revive: true,
        sell_pokemon: false,
    };
}
