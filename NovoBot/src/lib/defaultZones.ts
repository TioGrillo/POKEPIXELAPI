import type { Zone } from '../types';

export const DEFAULT_ZONES: Zone[] = [
  // --- KANTO ---
  {
    id: '65183cd4-66f3-49a1-91a2-2c2eb9d614c7',
    name: 'Caça de Geodude',
    world: 'kanto',
    min_level: 5,
    recommended_level: 8,
    difficulty: 'Fácil',
    encounters: [
      { species_id: 'geodude', min_level: 5, max_level: 10, weight: 80 },
      { species_id: 'graveler', min_level: 12, max_level: 18, weight: 20 }
    ]
  },
  {
    id: 'zone-kanto-pidgey',
    name: 'Caça de Pidgey',
    world: 'kanto',
    min_level: 2,
    recommended_level: 4,
    difficulty: 'Fácil',
    encounters: [
      { species_id: 'pidgey', min_level: 2, max_level: 6, weight: 70 },
      { species_id: 'rattata', min_level: 2, max_level: 5, weight: 30 }
    ]
  },
  {
    id: 'zone-kanto-caterpie',
    name: 'Caça de Caterpie',
    world: 'kanto',
    min_level: 3,
    recommended_level: 5,
    difficulty: 'Fácil',
    encounters: [
      { species_id: 'caterpie', min_level: 3, max_level: 6, weight: 50 },
      { species_id: 'metapod', min_level: 5, max_level: 8, weight: 50 }
    ]
  },
  {
    id: 'zone-kanto-pikachu',
    name: 'Caça de Pikachu',
    world: 'kanto',
    min_level: 8,
    recommended_level: 12,
    difficulty: 'Médio',
    encounters: [
      { species_id: 'pikachu', min_level: 8, max_level: 14, weight: 40 },
      { species_id: 'pichu', min_level: 5, max_level: 8, weight: 60 }
    ]
  },
  {
    id: 'zone-kanto-machop',
    name: 'Caça de Machop',
    world: 'kanto',
    min_level: 12,
    recommended_level: 16,
    difficulty: 'Médio',
    encounters: [
      { species_id: 'machop', min_level: 12, max_level: 18, weight: 80 },
      { species_id: 'machoke', min_level: 20, max_level: 28, weight: 20 }
    ]
  },
  {
    id: 'zone-kanto-gastly',
    name: 'Caça de Gastly',
    world: 'kanto',
    min_level: 15,
    recommended_level: 20,
    difficulty: 'Médio',
    encounters: [
      { species_id: 'gastly', min_level: 15, max_level: 22, weight: 80 },
      { species_id: 'haunter', min_level: 24, max_level: 30, weight: 20 }
    ]
  },
  {
    id: 'zone-kanto-dratini',
    name: 'Caça de Dratini',
    world: 'kanto',
    min_level: 28,
    recommended_level: 35,
    difficulty: 'Difícil',
    encounters: [
      { species_id: 'dratini', min_level: 28, max_level: 38, weight: 90 },
      { species_id: 'dragonair', min_level: 40, max_level: 48, weight: 10 }
    ]
  },

  // --- JOHTO ---
  {
    id: 'zone-johto-sentret',
    name: 'Caça de Sentret',
    world: 'johto',
    min_level: 4,
    recommended_level: 6,
    difficulty: 'Fácil',
    encounters: [
      { species_id: 'sentret', min_level: 4, max_level: 8, weight: 70 },
      { species_id: 'furret', min_level: 15, max_level: 20, weight: 30 }
    ]
  },
  {
    id: 'zone-johto-mareep',
    name: 'Caça de Mareep',
    world: 'johto',
    min_level: 7,
    recommended_level: 10,
    difficulty: 'Fácil',
    encounters: [
      { species_id: 'mareep', min_level: 7, max_level: 12, weight: 80 },
      { species_id: 'flaaffy', min_level: 15, max_level: 20, weight: 20 }
    ]
  },
  {
    id: 'zone-johto-larvitar',
    name: 'Caça de Larvitar',
    world: 'johto',
    min_level: 30,
    recommended_level: 38,
    difficulty: 'Difícil',
    encounters: [
      { species_id: 'larvitar', min_level: 30, max_level: 42, weight: 85 },
      { species_id: 'pupitar', min_level: 42, max_level: 50, weight: 15 }
    ]
  },

  // --- ILHAS LENDÁRIAS (LEGENDARY) ---
  {
    id: 'zone-legendary-articuno',
    name: 'Ilha do Articuno',
    world: 'legendary',
    min_level: 50,
    recommended_level: 60,
    difficulty: 'Lendário',
    encounters: [
      { species_id: 'articuno', min_level: 50, max_level: 70, weight: 100 }
    ]
  },
  {
    id: 'zone-legendary-zapdos',
    name: 'Ilha do Zapdos',
    world: 'legendary',
    min_level: 50,
    recommended_level: 60,
    difficulty: 'Lendário',
    encounters: [
      { species_id: 'zapdos', min_level: 50, max_level: 70, weight: 100 }
    ]
  },
  {
    id: 'zone-legendary-moltres',
    name: 'Ilha do Moltres',
    world: 'legendary',
    min_level: 50,
    recommended_level: 60,
    difficulty: 'Lendário',
    encounters: [
      { species_id: 'moltres', min_level: 50, max_level: 70, weight: 100 }
    ]
  },
  {
    id: 'zone-legendary-mewtwo',
    name: 'Caverna de Mewtwo',
    world: 'legendary',
    min_level: 70,
    recommended_level: 85,
    difficulty: 'Mítico',
    encounters: [
      { species_id: 'mewtwo', min_level: 70, max_level: 100, weight: 100 }
    ]
  },

  // --- UNKNOWN 1 & UNKNOWN 2 ---
  {
    id: '724a5d4c-8f84-487c-88d0-78b16595a2da',
    name: 'Caça de Aerodactyl',
    world: '724a5d4c-8f84-487c-88d0-78b16595a2da',
    min_level: 40,
    recommended_level: 50,
    difficulty: 'Épico',
    encounters: [
      { species_id: 'aerodactyl', min_level: 40, max_level: 55, weight: 100 }
    ]
  },
  {
    id: '21fefe70-1856-4086-9489-b9ca79aa0630',
    name: 'Caça de Dragonite',
    world: '21fefe70-1856-4086-9489-b9ca79aa0630',
    min_level: 45,
    recommended_level: 55,
    difficulty: 'Épico',
    encounters: [
      { species_id: 'dragonite', min_level: 45, max_level: 60, weight: 100 }
    ]
  }
];
