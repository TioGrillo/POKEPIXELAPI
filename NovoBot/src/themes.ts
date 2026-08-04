export interface Theme {
  id: string;
  label: string;
  preview: string;
  category: 'dark' | 'tinted' | 'light';
  vars: Record<string, string>;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbStr(r: number, g: number, b: number): string {
  return `${r} ${g} ${b}`;
}

function mix(
  base: [number, number, number],
  tint: [number, number, number],
  amount: number,
): string {
  return rgbStr(
    Math.round(base[0] + (tint[0] - base[0]) * amount),
    Math.round(base[1] + (tint[1] - base[1]) * amount),
    Math.round(base[2] + (tint[2] - base[2]) * amount),
  );
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbStr(
    Math.round(r * factor),
    Math.round(g * factor),
    Math.round(b * factor),
  );
}

function lighten(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbStr(
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor)),
  );
}

const DARK_BG_DEEP = '2 6 23';
const DARK_BG_BASE = '15 23 42';
const DARK_BG_SURFACE = '30 41 59';
const DARK_BG_ELEVATED = '51 65 85';
const DARK_BORDER = '51 65 85';
const DARK_TEXT_PRIMARY = '248 250 252';
const DARK_TEXT_SECONDARY = '203 213 225';
const DARK_TEXT_MUTED = '148 163 184';
const DARK_TEXT_FAINT = '100 116 139';
const DARK_SUCCESS = '34 197 94';
const DARK_WARNING = '234 179 8';
const DARK_DANGER = '239 68 68';

const LIGHT_BG_DEEP = '226 232 240';
const LIGHT_BG_BASE = '248 250 252';
const LIGHT_BG_SURFACE = '255 255 255';
const LIGHT_BG_ELEVATED = '241 245 249';
const LIGHT_BORDER = '226 232 240';
const LIGHT_TEXT_PRIMARY = '15 23 42';
const LIGHT_TEXT_SECONDARY = '71 85 105';
const LIGHT_TEXT_MUTED = '100 116 139';
const LIGHT_TEXT_FAINT = '148 163 184';
const LIGHT_SUCCESS = '22 163 74';
const LIGHT_WARNING = '202 138 4';
const LIGHT_DANGER = '220 38 38';

const TINT_DEEP = 0.06;
const TINT_BASE = 0.08;
const TINT_SURFACE = 0.10;
const TINT_ELEVATED = 0.12;
const TINT_BORDER = 0.10;

const _darkBgDeep: [number, number, number] = [2, 6, 23];
const _darkBgBase: [number, number, number] = [15, 23, 42];
const _darkBgSurface: [number, number, number] = [30, 41, 59];
const _darkBgElevated: [number, number, number] = [51, 65, 85];
const _darkBorder: [number, number, number] = [51, 65, 85];

function darkVars(hex: string): Record<string, string> {
  const [ar, ag, ab] = hexToRgb(hex);
  return {
    '--accent': rgbStr(ar, ag, ab),
    '--accent-light': lighten(hex, 0.3),
    '--accent-dark': darken(hex, 0.7),
    '--bg-deep': DARK_BG_DEEP,
    '--bg-base': DARK_BG_BASE,
    '--bg-surface': DARK_BG_SURFACE,
    '--bg-elevated': DARK_BG_ELEVATED,
    '--text-primary': DARK_TEXT_PRIMARY,
    '--text-secondary': DARK_TEXT_SECONDARY,
    '--text-muted': DARK_TEXT_MUTED,
    '--text-faint': DARK_TEXT_FAINT,
    '--border': DARK_BORDER,
    '--success': DARK_SUCCESS,
    '--warning': DARK_WARNING,
    '--danger': DARK_DANGER,
  };
}

function tintedVars(hex: string): Record<string, string> {
  const tint = hexToRgb(hex);
  const [ar, ag, ab] = hexToRgb(hex);
  return {
    '--accent': rgbStr(ar, ag, ab),
    '--accent-light': lighten(hex, 0.3),
    '--accent-dark': darken(hex, 0.7),
    '--bg-deep': mix(_darkBgDeep, tint, TINT_DEEP),
    '--bg-base': mix(_darkBgBase, tint, TINT_BASE),
    '--bg-surface': mix(_darkBgSurface, tint, TINT_SURFACE),
    '--bg-elevated': mix(_darkBgElevated, tint, TINT_ELEVATED),
    '--text-primary': DARK_TEXT_PRIMARY,
    '--text-secondary': DARK_TEXT_SECONDARY,
    '--text-muted': DARK_TEXT_MUTED,
    '--text-faint': DARK_TEXT_FAINT,
    '--border': mix(_darkBorder, tint, TINT_BORDER),
    '--success': DARK_SUCCESS,
    '--warning': DARK_WARNING,
    '--danger': DARK_DANGER,
  };
}

function lightVars(hex: string): Record<string, string> {
  const [ar, ag, ab] = hexToRgb(hex);
  return {
    '--accent': rgbStr(ar, ag, ab),
    '--accent-light': lighten(hex, 0.2),
    '--accent-dark': darken(hex, 0.8),
    '--bg-deep': LIGHT_BG_DEEP,
    '--bg-base': LIGHT_BG_BASE,
    '--bg-surface': LIGHT_BG_SURFACE,
    '--bg-elevated': LIGHT_BG_ELEVATED,
    '--text-primary': LIGHT_TEXT_PRIMARY,
    '--text-secondary': LIGHT_TEXT_SECONDARY,
    '--text-muted': LIGHT_TEXT_MUTED,
    '--text-faint': LIGHT_TEXT_FAINT,
    '--border': LIGHT_BORDER,
    '--success': LIGHT_SUCCESS,
    '--warning': LIGHT_WARNING,
    '--danger': LIGHT_DANGER,
  };
}

export const THEMES: Theme[] = [
  // ────────────────────────────────────────────
  //  DARK THEMES
  // ────────────────────────────────────────────
  {
    id: 'obsidian',
    label: 'Obsidian',
    preview: '#06b6d4',
    category: 'dark',
    vars: darkVars('#06b6d4'),
  },
  {
    id: 'espresso',
    label: 'Espresso',
    preview: '#b45309',
    category: 'dark',
    vars: darkVars('#b45309'),
  },
  {
    id: 'deep_space',
    label: 'Deep Space',
    preview: '#3b82f6',
    category: 'dark',
    vars: darkVars('#3b82f6'),
  },
  {
    id: 'blood_moon',
    label: 'Blood Moon',
    preview: '#ef4444',
    category: 'dark',
    vars: darkVars('#ef4444'),
  },
  {
    id: 'forest_night',
    label: 'Forest Night',
    preview: '#22c55e',
    category: 'dark',
    vars: darkVars('#22c55e'),
  },
  {
    id: 'midnight_indigo',
    label: 'Midnight Indigo',
    preview: '#6366f1',
    category: 'dark',
    vars: darkVars('#6366f1'),
  },
  {
    id: 'shadow_violet',
    label: 'Shadow Violet',
    preview: '#a855f7',
    category: 'dark',
    vars: darkVars('#a855f7'),
  },
  {
    id: 'gunmetal',
    label: 'Gunmetal',
    preview: '#94a3b8',
    category: 'dark',
    vars: darkVars('#94a3b8'),
  },
  {
    id: 'volcanic',
    label: 'Volcanic',
    preview: '#f97316',
    category: 'dark',
    vars: darkVars('#f97316'),
  },
  {
    id: 'abyss',
    label: 'Abyss',
    preview: '#0d9488',
    category: 'dark',
    vars: darkVars('#0d9488'),
  },
  {
    id: 'gothic',
    label: 'Gothic',
    preview: '#7c3aed',
    category: 'dark',
    vars: darkVars('#7c3aed'),
  },
  {
    id: 'void',
    label: 'Void',
    preview: '#c026d3',
    category: 'dark',
    vars: darkVars('#c026d3'),
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    preview: '#a8a29e',
    category: 'dark',
    vars: darkVars('#a8a29e'),
  },
  {
    id: 'obsidian_flame',
    label: 'Obsidian Flame',
    preview: '#dc2626',
    category: 'dark',
    vars: darkVars('#dc2626'),
  },
  {
    id: 'phantom',
    label: 'Phantom',
    preview: '#8b5cf6',
    category: 'dark',
    vars: darkVars('#8b5cf6'),
  },

  // ────────────────────────────────────────────
  //  TINTED THEMES
  // ────────────────────────────────────────────
  {
    id: 'cerulean',
    label: 'Cerulean',
    preview: '#3b82f6',
    category: 'tinted',
    vars: tintedVars('#3b82f6'),
  },
  {
    id: 'vermilion',
    label: 'Vermilion',
    preview: '#f97316',
    category: 'tinted',
    vars: tintedVars('#f97316'),
  },
  {
    id: 'lavender_town',
    label: 'Lavender Town',
    preview: '#a855f7',
    category: 'tinted',
    vars: tintedVars('#a855f7'),
  },
  {
    id: 'celadon',
    label: 'Celadon',
    preview: '#10b981',
    category: 'tinted',
    vars: tintedVars('#10b981'),
  },
  {
    id: 'fuchsia_city',
    label: 'Fuchsia City',
    preview: '#ec4899',
    category: 'tinted',
    vars: tintedVars('#ec4899'),
  },
  {
    id: 'saffron',
    label: 'Saffron',
    preview: '#eab308',
    category: 'tinted',
    vars: tintedVars('#eab308'),
  },
  {
    id: 'cinnabar',
    label: 'Cinnabar',
    preview: '#ef4444',
    category: 'tinted',
    vars: tintedVars('#ef4444'),
  },
  {
    id: 'viridian',
    label: 'Viridian',
    preview: '#14b8a6',
    category: 'tinted',
    vars: tintedVars('#14b8a6'),
  },
  {
    id: 'goldenrod',
    label: 'Goldenrod',
    preview: '#f59e0b',
    category: 'tinted',
    vars: tintedVars('#f59e0b'),
  },
  {
    id: 'frost_blue',
    label: 'Frost Blue',
    preview: '#60a5fa',
    category: 'tinted',
    vars: tintedVars('#60a5fa'),
  },
  {
    id: 'rose_quartz',
    label: 'Rose Quartz',
    preview: '#f472b6',
    category: 'tinted',
    vars: tintedVars('#f472b6'),
  },
  {
    id: 'amethyst',
    label: 'Amethyst',
    preview: '#8b5cf6',
    category: 'tinted',
    vars: tintedVars('#8b5cf6'),
  },
  {
    id: 'topaz',
    label: 'Topaz',
    preview: '#fbbf24',
    category: 'tinted',
    vars: tintedVars('#fbbf24'),
  },
  {
    id: 'jade',
    label: 'Jade',
    preview: '#34d399',
    category: 'tinted',
    vars: tintedVars('#34d399'),
  },
  {
    id: 'coral',
    label: 'Coral',
    preview: '#fb7185',
    category: 'tinted',
    vars: tintedVars('#fb7185'),
  },
  {
    id: 'sapphire',
    label: 'Sapphire',
    preview: '#2563eb',
    category: 'tinted',
    vars: tintedVars('#2563eb'),
  },
  {
    id: 'ruby',
    label: 'Ruby',
    preview: '#dc2626',
    category: 'tinted',
    vars: tintedVars('#dc2626'),
  },
  {
    id: 'emerald',
    label: 'Emerald',
    preview: '#059669',
    category: 'tinted',
    vars: tintedVars('#059669'),
  },
  {
    id: 'aquamarine',
    label: 'Aquamarine',
    preview: '#06b6d4',
    category: 'tinted',
    vars: tintedVars('#06b6d4'),
  },
  {
    id: 'magma',
    label: 'Magma',
    preview: '#ea580c',
    category: 'tinted',
    vars: tintedVars('#ea580c'),
  },

  // ────────────────────────────────────────────
  //  LIGHT THEMES
  // ────────────────────────────────────────────
  {
    id: 'pearl',
    label: 'Pearl',
    preview: '#64748b',
    category: 'light',
    vars: lightVars('#64748b'),
  },
  {
    id: 'pastel_mint',
    label: 'Pastel Mint',
    preview: '#10b981',
    category: 'light',
    vars: lightVars('#10b981'),
  },
  {
    id: 'pastel_peach',
    label: 'Pastel Peach',
    preview: '#f97316',
    category: 'light',
    vars: lightVars('#f97316'),
  },
  {
    id: 'pastel_lavender',
    label: 'Pastel Lavender',
    preview: '#a855f7',
    category: 'light',
    vars: lightVars('#a855f7'),
  },
  {
    id: 'pastel_sky',
    label: 'Pastel Sky',
    preview: '#3b82f6',
    category: 'light',
    vars: lightVars('#3b82f6'),
  },
  {
    id: 'pastel_rose',
    label: 'Pastel Rose',
    preview: '#ec4899',
    category: 'light',
    vars: lightVars('#ec4899'),
  },
  {
    id: 'pastel_lemon',
    label: 'Pastel Lemon',
    preview: '#eab308',
    category: 'light',
    vars: lightVars('#eab308'),
  },
];

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}

export function applyCustomAccent(hex: string): void {
  const root = document.documentElement;
  const [r, g, b] = hexToRgb(hex);
  root.style.setProperty('--accent', rgbStr(r, g, b));
  root.style.setProperty('--accent-light', lighten(hex, 0.3));
  root.style.setProperty('--accent-dark', darken(hex, 0.7));
}
