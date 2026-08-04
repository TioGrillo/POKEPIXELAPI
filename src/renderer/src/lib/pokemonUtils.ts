import { getRarity, getRarityLabel, getTier, Rarity } from "./rarity";

const POKEPIXEL_BASE = "https://pokepixel.nietore.com";
const POKEAPI_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export interface SpriteInfo {
  animated: string;
  fallback: string;
}

export function getPokemonDexNumber(p: any, dexMap: Record<string, number> = {}): number {
  if (!p) return 0;
  if (typeof p.dex_id === "number" && p.dex_id > 0) return p.dex_id;
  if (typeof p.dexId === "number" && p.dexId > 0) return p.dexId;
  if (typeof p.pokemonId === "number" && p.pokemonId > 0) return p.pokemonId;

  const rawName = String(p.species_name || p.species_id || p.species || p.slug || p.name || "").toLowerCase();
  const clean = rawName
    .replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_-]+/g, "")
    .replace(/^milch-/, "")
    .trim();

  return dexMap[clean] || dexMap[rawName] || 0;
}

export function getSlug(p: any): string {
  if (!p) return "";
  const raw = String(p.species_id || p.species || p.slug || p.name || "").toLowerCase();
  return raw
    .replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_-]+/g, "")
    .replace(/^milch-/, "")
    .trim();
}

export function getPokemonSprite(p: any, dexMap: Record<string, number> = {}): SpriteInfo {
  if (p.is_shiny && p.shiny_sprite_url) {
    const url = p.shiny_sprite_url.startsWith("http") ? p.shiny_sprite_url : `${POKEPIXEL_BASE}${p.shiny_sprite_url}`;
    return { animated: url, fallback: url };
  }
  if (p.normal_sprite_url) {
    const url = p.normal_sprite_url.startsWith("http") ? p.normal_sprite_url : `${POKEPIXEL_BASE}${p.normal_sprite_url}`;
    return { animated: url, fallback: url };
  }
  const slug = getSlug(p);
  if (slug) {
    const pokepixelUrl = `${POKEPIXEL_BASE}/assets/imported/creatures/${slug}/front.png`;
    const dex = getPokemonDexNumber(p, dexMap);
    if (dex > 0) {
      return {
        animated: pokepixelUrl,
        fallback: `${POKEAPI_BASE}/versions/generation-v/black-white/animated/${dex}.gif`,
      };
    }
    return { animated: pokepixelUrl, fallback: pokepixelUrl };
  }
  const dex = getPokemonDexNumber(p, dexMap);
  if (dex > 0) {
    return {
      animated: `${POKEAPI_BASE}/versions/generation-v/black-white/animated/${dex}.gif`,
      fallback: `${POKEAPI_BASE}/${dex}.png`,
    };
  }
  return { animated: "", fallback: "" };
}

export function getPokemonDisplayName(p: any): string {
  if (!p) return "Pokemon";
  const species = p.species_name || p.species || p.species_id || p.name || p.slug;
  if (species && typeof species === "string" && species.length > 1) {
    const cap = species.charAt(0).toUpperCase() + species.slice(1);
    if (p.nickname && p.nickname.toLowerCase() !== species.toLowerCase()) {
      return `${p.nickname} (${cap})`;
    }
    return cap;
  }
  if (p.name) return p.name;
  if (p.nickname) return p.nickname;
  if (p.id) return `#${String(p.id).substring(0, 8)}`;
  return "Pokemon";
}
