import path from 'path'

// SPT Client root path
export const SPT_CLIENT_PATH = 'F:\\Tarkov\\Client.0.16.9.0.40087'

// Derived paths
export const SPT_DATA_PATH = path.join(SPT_CLIENT_PATH, 'SPT', 'SPT_Data')
export const DATABASE_PATH = path.join(SPT_DATA_PATH, 'database')
export const TEMPLATES_PATH = path.join(DATABASE_PATH, 'templates')
export const LOCALES_PATH = path.join(DATABASE_PATH, 'locales', 'global')
export const MODS_PATH = path.join(SPT_CLIENT_PATH, 'SPT', 'user', 'mods')
export const HANDBOOK_IMAGES_PATH = path.join(SPT_DATA_PATH, 'images', 'handbook')

// Profile Editor exported DB (post-SPT-server-patch data, includes runtime modifications)
export const EXPORTED_DB_PATH = path.join(MODS_PATH, 'SPT-AKI Profile Editor.ModHelper', 'exportedDB')

// Data files
// Use exported Items.json instead of raw SPT templates items.json:
// SPT server patches slot filters and adds items at runtime; the raw templates
// file only has pre-patch data (e.g. barrel mod_muzzle filter: 1 item vs 26 patched).
export const ITEMS_FILE = path.join(EXPORTED_DB_PATH, 'Items.json')
export const HANDBOOK_FILE = path.join(TEMPLATES_PATH, 'handbook.json')
export const LOCALE_CH_FILE = path.join(LOCALES_PATH, 'ch.json')
export const LOCALE_EN_FILE = path.join(LOCALES_PATH, 'en.json')
export const GLOBALS_FILE = path.join(DATABASE_PATH, 'globals.json')
export const QUESTS_FILE = path.join(TEMPLATES_PATH, 'quests.json')
export const TRADERS_PATH = path.join(DATABASE_PATH, 'traders')
export const ITEM_PRESETS_FILE = path.join(EXPORTED_DB_PATH, 'ItemPresets.json')

// SPT Server (for image download)
export const SPT_SERVER_URL = 'https://127.0.0.1:6969'

// Output paths (relative to project root)
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..')
export const OUTPUT_DATA_PATH = path.join(PROJECT_ROOT, 'public', 'data')
export const OUTPUT_IMAGES_ITEMS_PATH = path.join(PROJECT_ROOT, 'public', 'images', 'items')
export const OUTPUT_IMAGES_CATEGORIES_PATH = path.join(PROJECT_ROOT, 'public', 'images', 'categories')

// System/internal types to exclude from wiki
export const EXCLUDED_TYPES = new Set([
  'Inventory',
  'Pockets',
  'Stash',
  'SortingTable',
  'HideoutAreaContainer',
  'MobContainer',
  'StationaryContainer',
  'SimpleContainer',
  'Item',
  'CompoundItem',
  'Equipment',
  'ArmoredEquipment',
  'Mod',
  'GearMod',
  'FunctionalMod',
  'MasterMod',
  'StackableItem',
  'SearchableItem',
  'FoodDrink',
  'Meds',
  'BuiltInInserts',
  'Flyer',
  'DialogItem',
  'MarkOfUnknown',
])

// Node types that represent abstract base classes (not actual items)
// Items whose type chain leads to these are abstract type definitions
export const ABSTRACT_NODE_IDS = new Set<string>() // Populated at runtime from _type=Node entries
