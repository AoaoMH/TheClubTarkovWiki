import path from 'path'

// SPT Client root path
export const SPT_CLIENT_PATH = 'F:\\Tarkov\\Client.0.16.9.0.40087'

// Derived paths
export const SPT_DATA_PATH = path.join(SPT_CLIENT_PATH, 'SPT', 'SPT_Data')
export const MODS_PATH = path.join(SPT_CLIENT_PATH, 'SPT', 'user', 'mods')
export const HANDBOOK_IMAGES_PATH = path.join(SPT_DATA_PATH, 'images', 'handbook')

// ClubWikiDataExporter exported DB (post all mod patches, captured at postAkiLoad stage)
// More complete than Profile Editor's export which misses runtime filter patches from other mods
export const EXPORTED_DB_PATH = path.join(MODS_PATH, 'ClubWikiDataExporter', 'exportedDB')

// Data files
// All data sourced from ClubWikiDataExporter mod's exportedDB (post all mod patches):
// SPT server patches slot filters and adds items at runtime; our mod runs at postAkiLoad
// with TypePriority=MaxValue to ensure it executes AFTER all other mods have patched the database.
export const ITEMS_FILE = path.join(EXPORTED_DB_PATH, 'Items.json')
export const HANDBOOK_FILE = path.join(EXPORTED_DB_PATH, 'Handbook.json')
export const LOCALE_CH_FILE = path.join(EXPORTED_DB_PATH, 'locales', 'ch.json')
export const LOCALE_EN_FILE = path.join(EXPORTED_DB_PATH, 'locales', 'en.json')
export const GLOBALS_FILE = path.join(EXPORTED_DB_PATH, 'Globals.json')
export const QUESTS_FILE = path.join(EXPORTED_DB_PATH, 'Quests.json')
export const TRADERS_PATH = path.join(EXPORTED_DB_PATH, 'traders')
export const ITEM_PRESETS_FILE = path.join(EXPORTED_DB_PATH, 'ItemPresets.json')

// SPT Server (for image download)
export const SPT_SERVER_URL = 'https://127.0.0.1:6969'

// ClubWikiIconExporter exported icons (from game runtime rendering)
export const EXPORTED_ICONS_PATH = path.join(
  SPT_CLIENT_PATH, 'BepInEx', 'plugins', 'ClubWikiIconExporter', 'exported-icons'
)

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
