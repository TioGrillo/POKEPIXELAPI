import slugToDex from "../../../shared/slug_to_dex.json";
import huntsData from "../../../shared/hunts_data.json";
import pokeBaseStats from "../../../shared/poke_base_stats.json";
import itemsData from "../../../shared/items_data.json";

export async function loadJSON<T = any>(filename: string): Promise<T> {
  if (filename === "slug_to_dex.json") return slugToDex as unknown as T;
  if (filename === "hunts_data.json") {
    const adapted = (huntsData as any[]).map((h: any) => ({
      id: h.id || h.slug || h.name,
      name: h.name || h.slug,
      area: h.world || h.area || "kanto",
      minLevel: h.min_level ?? h.level ?? 1,
      maxLevel: h.max_level ?? h.level ?? 1,
      difficulty: h.difficulty,
      map_id: h.map_id,
      encounters: h.encounters,
    }));
    return { hunts: adapted } as unknown as T;
  }
  if (filename === "poke_base_stats.json") return pokeBaseStats as unknown as T;
  if (filename === "items_data.json") return itemsData as unknown as T;
  return null as unknown as T;
}

