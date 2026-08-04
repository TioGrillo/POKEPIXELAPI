"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokePixelEngine = void 0;
var axios_1 = require("axios");
var BASE_URL = 'https://pokepixel.nietore.com';
var PokePixelEngine = /** @class */ (function () {
    function PokePixelEngine(email, password, token, zoneId, captureConfig, updateState, pushLog, onAuthError, globalShinyMode, zoneList, autoPotionThreshold, autoSellThreshold) {
        if (globalShinyMode === void 0) { globalShinyMode = false; }
        if (zoneList === void 0) { zoneList = []; }
        if (autoPotionThreshold === void 0) { autoPotionThreshold = 50; }
        if (autoSellThreshold === void 0) { autoSellThreshold = 0; }
        this.isHunting = false;
        this.dynamicMapId = null;
        this.allocSpecies = '';
        this.currentZoneIndex = 0;
        this.preparedZone = null;
        this.allocLevel = 1;
        this.currentHuntEventId = null;
        this.stats = { encounters: 0, shinies: 0 };
        this.lastKills = -1;
        this.lastCaptures = -1;
        this.waitingForCaptureResult = false;
        this.lastTargetId = null;
        this.escapedEventIds = new Set();
        this.sessionKills = 0;
        this.email = email;
        this.password = password;
        this.token = token;
        this.currentZone = zoneId;
        this.captureConfig = captureConfig;
        this.updateState = updateState;
        this.pushLog = pushLog;
        this.onAuthError = onAuthError;
        this.globalShinyMode = globalShinyMode;
        this.zoneList = zoneList;
        this.autoPotionThreshold = autoPotionThreshold;
        this.autoSellThreshold = autoSellThreshold;
    }
    PokePixelEngine.prototype.api = function () {
        return axios_1.default.create({
            baseURL: BASE_URL,
            headers: {
                'Authorization': "Bearer ".concat(this.token),
                'Content-Type': 'application/json'
            },
            timeout: 5000,
            validateStatus: function () { return true; }
        });
    };
    PokePixelEngine.prototype.autoRelogin = function () {
        return __awaiter(this, void 0, Promise, function () {
            var res, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.email || !this.password)
                            return [2 /*return*/, false];
                        this.pushLog('🔄 Tentando auto-relogin silencioso...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axios_1.default.post("".concat(BASE_URL, "/api/v1/auth/login"), {
                                login: this.email,
                                password: this.password
                            }, { validateStatus: function () { return true; } })];
                    case 2:
                        res = _a.sent();
                        if (res.status === 200 && res.data && (res.data.token || res.data.access_token)) {
                            this.token = res.data.token || res.data.access_token;
                            this.pushLog('✅ Reconectado com sucesso! Retomando caça...');
                            this.updateState({ token: this.token });
                            return [2 /*return*/, true];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, false];
                }
            });
        });
    };
    PokePixelEngine.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var prep, reconnected, errorMsg;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        this.isHunting = true;
                        this.updateState({ status: 'hunting' });
                        this.pushLog('Iniciando caça...');
                        return [4 /*yield*/, this.api().post('/api/v1/hunts/prepare', { zone_id: this.currentZone })];
                    case 1:
                        prep = _j.sent();
                        if (!(prep.status === 401)) return [3 /*break*/, 4];
                        this.pushLog('Sessão expirada no prepare. Acionando Auto-Relogin...');
                        return [4 /*yield*/, this.autoRelogin()];
                    case 2:
                        reconnected = _j.sent();
                        if (!reconnected) {
                            this.stop();
                            this.onAuthError();
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.api().post('/api/v1/hunts/prepare', { zone_id: this.currentZone })];
                    case 3:
                        // Retry prepare
                        prep = _j.sent();
                        _j.label = 4;
                    case 4:
                        if (prep.status !== 200 && prep.status !== 201) {
                            errorMsg = ((_b = (_a = prep.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || JSON.stringify(prep.data) || 'Unknown error';
                            this.pushLog("Erro ao entrar no mapa: ".concat(prep.status, " - ").concat(errorMsg));
                            this.stop();
                            return [2 /*return*/];
                        }
                        this.preparedZone = this.currentZone;
                        this.dynamicMapId = ((_d = (_c = prep.data) === null || _c === void 0 ? void 0 : _c.allocation) === null || _d === void 0 ? void 0 : _d.map_id) || null;
                        this.allocSpecies = ((_f = (_e = prep.data) === null || _e === void 0 ? void 0 : _e.allocation) === null || _f === void 0 ? void 0 : _f.species_id) || 'sunkern';
                        this.allocLevel = ((_h = (_g = prep.data) === null || _g === void 0 ? void 0 : _g.allocation) === null || _h === void 0 ? void 0 : _h.level) || 1;
                        this.pushLog("Entrou na zona ".concat(this.currentZone, " (Mapa ID alocado: ").concat(this.dynamicMapId, ") com sucesso!"));
                        this.huntLoop();
                        return [2 /*return*/];
                }
            });
        });
    };
    PokePixelEngine.prototype.stop = function () {
        if (!this.isHunting)
            return;
        this.isHunting = false;
        this.updateState({ status: 'idle' });
        this.pushLog('Caça parada.');
    };
    PokePixelEngine.prototype.huntLoop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var nextDelay, prep, url, dummyEvents, wildRes, reconnected, monsters, validTargets, target, targetStillAlive, interestingTargets, isShiny, rarityName, startRes, shouldCapture, capRes, errMsg, engageRes, currentKills, currentCaptures, snapshot, e_2;
            var _this = this;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
            return __generator(this, function (_x) {
                switch (_x.label) {
                    case 0:
                        if (!this.isHunting)
                            return [2 /*return*/];
                        nextDelay = 1200;
                        _x.label = 1;
                    case 1:
                        _x.trys.push([1, 19, 20, 21]);
                        if (!(this.globalShinyMode && this.zoneList.length > 0)) return [3 /*break*/, 3];
                        this.currentZone = this.zoneList[this.currentZoneIndex];
                        if (!(this.preparedZone !== this.currentZone)) return [3 /*break*/, 3];
                        this.pushLog("\uD83D\uDE80 Saltando para zona ".concat(this.currentZoneIndex + 1, "/").concat(this.zoneList.length, " buscando raridades..."));
                        return [4 /*yield*/, this.api().post('/api/v1/hunts/prepare', { zone_id: this.currentZone }).catch(function () { return null; })];
                    case 2:
                        prep = _x.sent();
                        if (prep && (prep.status === 200 || prep.status === 201)) {
                            this.preparedZone = this.currentZone;
                            this.currentHuntEventId = null;
                            this.dynamicMapId = ((_b = (_a = prep.data) === null || _a === void 0 ? void 0 : _a.allocation) === null || _b === void 0 ? void 0 : _b.map_id) || null;
                            this.allocSpecies = ((_d = (_c = prep.data) === null || _c === void 0 ? void 0 : _c.allocation) === null || _d === void 0 ? void 0 : _d.species_id) || 'sunkern';
                            this.allocLevel = ((_f = (_e = prep.data) === null || _e === void 0 ? void 0 : _e.allocation) === null || _f === void 0 ? void 0 : _f.level) || 1;
                        }
                        else {
                            this.currentZoneIndex = (this.currentZoneIndex + 1) % this.zoneList.length;
                            setTimeout(function () { return _this.huntLoop(); }, 200);
                            return [2 /*return*/];
                        }
                        _x.label = 3;
                    case 3:
                        url = "/api/v1/wild-monsters?zone_id=".concat(this.currentZone);
                        if (this.dynamicMapId !== null) {
                            dummyEvents = Array.from({ length: 50 }, function (_, i) { return "".concat(i + 1, ":").concat(_this.allocSpecies); }).join(',');
                            url += "&map_id=".concat(this.dynamicMapId, "&events=").concat(encodeURIComponent(dummyEvents), "&level=").concat(this.allocLevel);
                        }
                        return [4 /*yield*/, this.api().get(url)];
                    case 4:
                        wildRes = _x.sent();
                        if (!(wildRes.status === 401)) return [3 /*break*/, 7];
                        this.pushLog('Sessão expirada no scanner. Acionando Auto-Relogin...');
                        return [4 /*yield*/, this.autoRelogin()];
                    case 5:
                        reconnected = _x.sent();
                        if (!reconnected) {
                            this.stop();
                            this.onAuthError();
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.api().get(url)];
                    case 6:
                        // Retry scanner
                        wildRes = _x.sent();
                        _x.label = 7;
                    case 7:
                        if (wildRes.status !== 200) {
                            this.pushLog("Aviso: Scanner retornou HTTP ".concat(wildRes.status, " - ").concat(JSON.stringify(wildRes.data).slice(0, 50)));
                        }
                        if (!((_g = wildRes.data) === null || _g === void 0 ? void 0 : _g.data)) return [3 /*break*/, 18];
                        monsters = wildRes.data.data;
                        validTargets = monsters.filter(function (m) { return m.hp > 0; });
                        target = validTargets.length > 0 ? validTargets[0] : null;
                        // Verificação do resultado da captura anterior
                        if (this.waitingForCaptureResult && this.lastTargetId) {
                            targetStillAlive = validTargets.some(function (m) { return m.event_id === _this.lastTargetId; });
                            if (!targetStillAlive) {
                                this.pushLog("\u2728 Pok\u00E9bola funcionou! Monstro capturado com sucesso!");
                                this.stats.shinies++;
                                this.updateState({ shinies: this.stats.shinies });
                                if (this.globalShinyMode) {
                                    this.stop();
                                    return [2 /*return*/];
                                }
                            }
                            else {
                                this.pushLog("\u274C O monstro escapou da Pok\u00E9bola! Partindo pra agress\u00E3o...");
                                this.escapedEventIds.add(this.lastTargetId);
                            }
                        }
                        this.waitingForCaptureResult = false;
                        this.lastTargetId = target ? target.event_id : null;
                        if (this.globalShinyMode) {
                            interestingTargets = validTargets.filter(function (m) {
                                var isShiny = m.is_shiny;
                                var q = m.quality || 'common';
                                return (isShiny && _this.captureConfig['shiny']) || _this.captureConfig[q];
                            });
                            if (interestingTargets.length > 0) {
                                target = interestingTargets[0];
                            }
                            else {
                                target = null;
                                this.currentZoneIndex = (this.currentZoneIndex + 1) % this.zoneList.length;
                                nextDelay = 0; // Maximum Overdrive
                            }
                        }
                        if (!target) return [3 /*break*/, 17];
                        isShiny = target.is_shiny;
                        rarityName = target.quality ? target.quality.toUpperCase() : 'COMUM';
                        // Prevent spamming "Detectado" every single turn if it's the same hunt event.
                        if (this.currentHuntEventId !== target.event_id) {
                            this.pushLog("Detectado: ".concat(target.species_id, " [").concat(rarityName, "] (Level ").concat(target.level, ") ").concat(isShiny ? '✨ SHINY' : '', " - HP: ").concat(target.hp));
                        }
                        if (!(this.currentHuntEventId !== target.event_id)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.api().post('/api/v1/hunts', {
                                zone_id: this.currentZone,
                                wild_monster_id: target.species_id,
                                map_id: this.dynamicMapId,
                                event_id: target.event_id,
                                level: target.level
                            }).catch(function (e) { return e.response || e; })];
                    case 8:
                        startRes = _x.sent();
                        if (startRes.status === 200 || startRes.status === 201) {
                            this.currentHuntEventId = target.event_id;
                            this.pushLog('Nova caça iniciada no servidor!');
                        }
                        else if (startRes.status === 409) {
                            this.currentHuntEventId = target.event_id;
                        }
                        else {
                            this.pushLog("Erro ao iniciar ca\u00E7a HTTP ".concat(startRes.status, ": ").concat(JSON.stringify(startRes.data)));
                            return [2 /*return*/];
                        }
                        _x.label = 9;
                    case 9:
                        shouldCapture = (isShiny || this.captureConfig[target.quality || 'common']) && !this.escapedEventIds.has(target.event_id);
                        if (!shouldCapture) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.api().post('/api/v1/hunts/current/capture', {
                                wild_monster_id: target.id || target.event_id,
                                capsule_item_id: 'capsule_ultra'
                            }).catch(function (e) { return e.response || e; })];
                    case 10:
                        capRes = _x.sent();
                        if (capRes.status === 200 || capRes.status === 201) {
                            this.pushLog("\u2728 Pok\u00E9bola lan\u00E7ada! Cruzando os dedos...");
                            this.waitingForCaptureResult = true;
                        }
                        else if (capRes.status === 409 && ((_j = (_h = capRes.data) === null || _h === void 0 ? void 0 : _h.error) === null || _j === void 0 ? void 0 : _j.code) === 'CAPTURE_ALREADY_ATTEMPTED') {
                            this.pushLog("\u2139\uFE0F Pok\u00E9bola lan\u00E7ada pelo Auto-Capture do servidor! Cruzando os dedos...");
                            this.waitingForCaptureResult = true;
                        }
                        else if (capRes.status === 400 && ((_l = (_k = capRes.data) === null || _k === void 0 ? void 0 : _k.error) === null || _l === void 0 ? void 0 : _l.code) === 'CAPTURE_FAILED') {
                            errMsg = ((_o = (_m = capRes.data) === null || _m === void 0 ? void 0 : _m.error) === null || _o === void 0 ? void 0 : _o.message) || 'Motivo desconhecido';
                            this.pushLog("\u274C O servidor recusou a captura! Motivo: ".concat(errMsg, ". Marcando para abate!"));
                            this.escapedEventIds.add(target.event_id);
                        }
                        else {
                            this.pushLog("Falha na captura: HTTP ".concat(capRes.status, " - ").concat(JSON.stringify(capRes.data)));
                        }
                        // Evita atacar (engage) o monstro, apenas tenta capturar a cada turno!
                        return [2 /*return*/];
                    case 11: return [4 /*yield*/, this.api().post('/api/v1/hunts/current/engage', {
                            zone_id: this.currentZone,
                            wild_monster_id: target.species_id,
                            map_id: this.dynamicMapId,
                            event_id: target.event_id,
                            level: target.level
                        }).catch(function (e) { return e.response || e; })];
                    case 12:
                        engageRes = _x.sent();
                        if (!(engageRes.status === 200 || engageRes.status === 201)) return [3 /*break*/, 15];
                        this.pushLog("\u2694\uFE0F Atacou o monstro! (Restam ".concat(target.hp, " HP)"));
                        this.stats.encounters++;
                        this.updateState({ encounters: this.stats.encounters });
                        currentKills = (_q = (_p = engageRes.data) === null || _p === void 0 ? void 0 : _p.summary) === null || _q === void 0 ? void 0 : _q.kills;
                        if (currentKills !== undefined) {
                            if (this.lastKills !== -1 && currentKills > this.lastKills) {
                                this.pushLog("\uD83D\uDC80 Monstro derrotado!");
                                this.currentHuntEventId = null;
                                this.sessionKills++;
                                if (this.autoSellThreshold > 0 && this.sessionKills % this.autoSellThreshold === 0) {
                                    // Executar a venda em background para não parar o loop (não usa await aqui)
                                    this.sellLoots();
                                }
                            }
                            this.lastKills = currentKills;
                        }
                        currentCaptures = (_s = (_r = engageRes.data) === null || _r === void 0 ? void 0 : _r.summary) === null || _s === void 0 ? void 0 : _s.captures;
                        if (currentCaptures !== undefined) {
                            if (this.lastCaptures !== -1 && currentCaptures > this.lastCaptures) {
                                this.pushLog("\u2728 Monstro capturado com sucesso!");
                                this.stats.shinies += (currentCaptures - this.lastCaptures);
                                this.updateState({ shinies: this.stats.shinies });
                                if (this.globalShinyMode) {
                                    this.pushLog("\uD83D\uDED1 Shiny capturado! Parando ca\u00E7a autom\u00E1tica.");
                                    this.stop();
                                    return [2 /*return*/];
                                }
                            }
                            this.lastCaptures = currentCaptures;
                        }
                        snapshot = (_u = (_t = engageRes.data) === null || _t === void 0 ? void 0 : _t.data) === null || _u === void 0 ? void 0 : _u.player;
                        if (!(snapshot && snapshot.hp && snapshot.max_hp)) return [3 /*break*/, 14];
                        this.updateState({ heroHp: snapshot.hp, heroMaxHp: snapshot.max_hp });
                        if (!(snapshot.hp / snapshot.max_hp < (this.autoPotionThreshold / 100))) return [3 /*break*/, 14];
                        this.pushLog("HP Baixo (".concat(snapshot.hp, "/").concat(snapshot.max_hp, "). Curando..."));
                        return [4 /*yield*/, this.api().post('/api/v1/inventory/use', { item_id: 'potion_ultra', amount: 1 })];
                    case 13:
                        _x.sent();
                        _x.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        if (engageRes.status === 400 && ((_w = (_v = engageRes.data) === null || _v === void 0 ? void 0 : _v.error) === null || _w === void 0 ? void 0 : _w.code) === 'ENGAGE_FAILED') {
                            this.currentHuntEventId = null;
                        }
                        else {
                            this.pushLog("Falha ao engajar HTTP ".concat(engageRes.status, ": ").concat(JSON.stringify(engageRes.data)));
                        }
                        _x.label = 16;
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        // Nenhum alvo vivo na zona. Reseta a caça atual.
                        this.currentHuntEventId = null;
                        _x.label = 18;
                    case 18: return [3 /*break*/, 21];
                    case 19:
                        e_2 = _x.sent();
                        this.pushLog("Erro no loop: ".concat(e_2.message));
                        return [3 /*break*/, 21];
                    case 20:
                        if (this.isHunting) {
                            setTimeout(function () { return _this.huntLoop(); }, nextDelay);
                        }
                        return [7 /*endfinally*/];
                    case 21: return [2 /*return*/];
                }
            });
        });
    };
    PokePixelEngine.prototype.sellLoots = function () {
        return __awaiter(this, void 0, void 0, function () {
            var invRes, items, sellable, payload, sellRes, e_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.pushLog('💰 Iniciando venda automática de loots...');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, this.api().get('/api/v1/inventory')];
                    case 2:
                        invRes = _b.sent();
                        if (!(invRes.status === 200 && ((_a = invRes.data) === null || _a === void 0 ? void 0 : _a.data))) return [3 /*break*/, 5];
                        items = invRes.data.data;
                        sellable = items.filter(function (i) { return i.can_sell && i.sellable_qty > 0 && (i.category === 'collectible' || i.type === 'collectible'); });
                        if (!(sellable.length > 0)) return [3 /*break*/, 4];
                        payload = {
                            items: sellable.map(function (i) { return ({ item_id: i.item_id, qty: i.sellable_qty }); })
                        };
                        return [4 /*yield*/, this.api().post('/api/v1/shop/sell/items', payload).catch(function (e) { return e.response || e; })];
                    case 3:
                        sellRes = _b.sent();
                        if (sellRes.status === 200) {
                            this.pushLog("\u2705 Venda conclu\u00EDda! Foram vendidos ".concat(sellable.length, " tipos de itens."));
                        }
                        else {
                            this.pushLog("\u274C Erro ao vender loots: HTTP ".concat(sellRes.status));
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        this.pushLog("\u2139\uFE0F Nenhum loot vend\u00E1vel no invent\u00E1rio.");
                        _b.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        e_3 = _b.sent();
                        this.pushLog("\u274C Erro ao vender loots: ".concat(e_3.message));
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return PokePixelEngine;
}());
exports.PokePixelEngine = PokePixelEngine;
