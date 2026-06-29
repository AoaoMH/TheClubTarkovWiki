import fs from 'fs'
import path from 'path'
import { HANDBOOK_IMAGES_PATH, OUTPUT_IMAGES_CATEGORIES_PATH } from '../config.js'
import type { Handbook, Locales, WikiCategory, WikiItem } from '../types.js'

// Handbook category names are not in locale files - hardcoded mapping
const CATEGORY_NAMES: Record<string, { zh: string; en: string }> = {
  // Root categories
  '5b47574386f77428ca22b33e': { zh: '交换物', en: 'Barter Items' },
  '5b47574386f77428ca22b33f': { zh: '装备', en: 'Gear' },
  '5b47574386f77428ca22b340': { zh: '补给品', en: 'Provisions' },
  '5b47574386f77428ca22b341': { zh: '信息物品', en: 'Info Items' },
  '5b47574386f77428ca22b342': { zh: '钥匙', en: 'Keys' },
  '5b47574386f77428ca22b343': { zh: '地图', en: 'Maps' },
  '5b47574386f77428ca22b344': { zh: '医疗物资', en: 'Medical Supplies' },
  '5b47574386f77428ca22b345': { zh: '特殊物品', en: 'Special Items' },
  '5b47574386f77428ca22b346': { zh: '弹药', en: 'Ammo' },
  '5b5f71a686f77447ed5636ab': { zh: '武器零件&配件', en: 'Weapon Mods' },
  '5b5f78b786f77447ed5636af': { zh: '货币', en: 'Money' },
  '5b5f78dc86f77409407a7f8e': { zh: '武器', en: 'Weapons' },
  '5b619f1a86f77450a702a6f3': { zh: '任务物品', en: 'Quest Items' },
  '6564b96a189fe36f356d177c': { zh: '其他交换物', en: 'Other Barter' },
  // Barter subcategories
  '5b47574386f77428ca22b2ed': { zh: '能源', en: 'Energy' },
  '5b47574386f77428ca22b2ee': { zh: '建筑材料', en: 'Building Materials' },
  '5b47574386f77428ca22b2ef': { zh: '电子元件', en: 'Electronics' },
  '5b47574386f77428ca22b2f0': { zh: '家居用品', en: 'Household Goods' },
  '5b47574386f77428ca22b2f1': { zh: '贵重品', en: 'Valuables' },
  '5b47574386f77428ca22b2f2': { zh: '易燃物', en: 'Flammable' },
  '5b47574386f77428ca22b2f3': { zh: '医疗用品', en: 'Medical Supplies' },
  '5b47574386f77428ca22b2f4': { zh: '其他', en: 'Other' },
  '5b47574386f77428ca22b2f6': { zh: '工具', en: 'Tools' },
  // Gear subcategories
  '5b47574386f77428ca22b32f': { zh: '面部装备', en: 'Face Covers' },
  '5b47574386f77428ca22b330': { zh: '头部装备', en: 'Headwear' },
  '5b47574386f77428ca22b331': { zh: '面罩护目镜', en: 'Visors' },
  '5b5f6f3c86f774094242ef87': { zh: '耳机', en: 'Headsets' },
  '5b5f6f6c86f774093f2ecf0b': { zh: '背包', en: 'Backpacks' },
  '5b5f6f8786f77447ed563642': { zh: '战术胸挂', en: 'Chest Rigs' },
  '5b5f6fa186f77409407a7eb7': { zh: '容器', en: 'Containers' },
  '5b5f6fd286f774093f2ecf0d': { zh: '安全箱', en: 'Secured Containers' },
  '5b5f701386f774093f2ecf0f': { zh: '防弹衣', en: 'Body Armor' },
  '5b5f704686f77447ec5d76d7': { zh: '装备组件', en: 'Gear Components' },
  // Provisions subcategories
  '5b47574386f77428ca22b335': { zh: '饮料', en: 'Drinks' },
  '5b47574386f77428ca22b336': { zh: '食物', en: 'Food' },
  // Medical subcategories
  '5b47574386f77428ca22b337': { zh: '药丸', en: 'Pills' },
  '5b47574386f77428ca22b338': { zh: '急救包', en: 'Medkits' },
  '5b47574386f77428ca22b339': { zh: '伤情处理', en: 'Injury Treatment' },
  '5b47574386f77428ca22b33a': { zh: '注射器', en: 'Injectors' },
  // Ammo subcategories
  '5b47574386f77428ca22b33b': { zh: '子弹', en: 'Rounds' },
  '5b47574386f77428ca22b33c': { zh: '弹药包', en: 'Ammo Packs' },
  // Keys subcategories
  '5c518ec986f7743b68682ce2': { zh: '机械钥匙', en: 'Mechanical Keys' },
  '5c518ed586f774119a772aee': { zh: '电子钥匙', en: 'Keycards' },
  // Mods subcategories
  '5b5f71b386f774093f2ecf11': { zh: '功能模块', en: 'Functional Mods' },
  '5b5f71c186f77409407a7ec0': { zh: '脚架', en: 'Bipods' },
  '5b5f71de86f774093f2ecf13': { zh: '前握把', en: 'Tactical Devices' },
  '5b5f724186f77447ed5636ad': { zh: '枪口装置', en: 'Muzzle Devices' },
  '5b5f724c86f774093f2ecf15': { zh: '消焰器&制退器', en: 'Flash Hiders' },
  '5b5f72f786f77447ec5d7702': { zh: '膛口转接器', en: 'Compensators' },
  '5b5f731a86f774093e6cb4f9': { zh: '消音器', en: 'Suppressors' },
  '5b5f736886f774094242f193': { zh: '照明&激光装置', en: 'Laser Devices' },
  '5b5f737886f774093e6cb4fb': { zh: '多功能战术设备', en: 'Laser' },
  '5b5f73ab86f774094242f195': { zh: '手电', en: 'Flashlights' },
  '5b5f73c486f77447ec5d7704': { zh: '激光/手电组合', en: 'Combo Devices' },
  '5b5f73ec86f774093e6cb4fd': { zh: '瞄具', en: 'Sights' },
  '5b5f740a86f77447ec5d7706': { zh: '突击瞄准镜', en: 'Reflex Sights' },
  '5b5f742686f774093e6cb4ff': { zh: '反射式瞄具', en: 'Holographic Sights' },
  '5b5f744786f774094242f197': { zh: '紧凑型反射式瞄具', en: 'Low Power Optics' },
  '5b5f746686f77447ec5d7708': { zh: '机械瞄具', en: 'Assault Scopes' },
  '5b5f748386f774093e6cb501': { zh: '光学瞄准镜', en: 'Sniper Scopes' },
  '5b5f749986f774094242f199': { zh: '特种观瞄', en: 'Special Sights' },
  '5b5f74cc86f77447ec5d770a': { zh: '辅助配件', en: 'Auxiliary Mods' },
  '5b5f750686f774093e6cb503': { zh: '装备配件', en: 'Gear Mods' },
  '5b5f751486f77447ec5d770c': { zh: '拉机柄', en: 'Charging Handles' },
  '5b5f752e86f774093e6cb505': { zh: '榴弹发射器', en: 'Grenade Launchers' },
  '5b5f754a86f774094242f19b': { zh: '弹匣', en: 'Magazines' },
  '5b5f755f86f77447ec5d770e': { zh: '基座', en: 'Mounts' },
  '5b5f757486f774093e6cb507': { zh: '枪托&框架', en: 'Stocks' },
  '5b5f759686f774094242f19d': { zh: '弹匣井', en: 'Tactical' },
  '5b5f75b986f77447ec5d7710': { zh: '基础部件', en: 'Vital Parts' },
  '5b5f75c686f774094242f19f': { zh: '枪管', en: 'Barrels' },
  '5b5f75e486f77447ec5d7712': { zh: '护木', en: 'Handguards' },
  '5b5f760586f774093e6cb509': { zh: '导气箍', en: 'Gas Blocks' },
  '5b5f761f86f774094242f1a1': { zh: '手枪式握把', en: 'Pistol Grips' },
  '5b5f764186f77447ec5d7714': { zh: '机匣&套筒', en: 'Receivers' },
  // Weapon subcategories
  '5b5f78e986f77447ed5636b1': { zh: '突击卡宾枪', en: 'Assault Carbines' },
  '5b5f78fc86f77409407a7f90': { zh: '突击步枪', en: 'Assault Rifles' },
  '5b5f791486f774093f2ed3be': { zh: '精确射手步枪', en: 'DMR' },
  '5b5f792486f77447ed5636b3': { zh: '手枪', en: 'Pistols' },
  '5b5f794b86f77409407a7f92': { zh: '霰弹枪', en: 'Shotguns' },
  '5b5f796a86f774093f2ed3c0': { zh: '冲锋枪', en: 'SMG' },
  '5b5f798886f77447ed5636b5': { zh: '栓动式步枪', en: 'Bolt-Action Rifles' },
  '5b5f79a486f77409407a7f94': { zh: '机枪', en: 'Machine Guns' },
  '5b5f79d186f774093f2ed3c2': { zh: '榴弹发射器', en: 'Grenade Launchers' },
  '5b5f79eb86f77447ed5636b7': { zh: '特殊武器', en: 'Special Weapons' },
  '5b5f7a0886f77409407a7f96': { zh: '近战武器', en: 'Melee Weapons' },
  '5b5f7a2386f774093f2ed3c4': { zh: '投掷物', en: 'Throwable Weapons' },
}

/**
 * Build the handbook category tree with localized names.
 */
export function buildCategories(
  handbook: Handbook,
  locales: { zh: Locales; en: Locales },
  wikiItems: WikiItem[]
): WikiCategory[] {
  // Count items per category and track first item image
  const itemCountMap = new Map<string, number>()
  const previewImageMap = new Map<string, string | null>()
  for (const item of wikiItems) {
    if (item.handbook.categoryId) {
      const catId = item.handbook.categoryId
      itemCountMap.set(catId, (itemCountMap.get(catId) || 0) + 1)
      if (!previewImageMap.has(catId) && item.image) {
        previewImageMap.set(catId, item.image)
      }
    }
  }

  const categories: WikiCategory[] = []

  for (const cat of handbook.Categories) {
    const fallback = CATEGORY_NAMES[cat.Id]
    const nameZh = fallback?.zh || cat.Id
    const nameEn = fallback?.en || cat.Id

    categories.push({
      id: cat.Id,
      parentId: cat.ParentId,
      name: { zh: nameZh, en: nameEn },
      icon: cat.Icon || '',
      order: parseInt(cat.Order) || 0,
      itemCount: itemCountMap.get(cat.Id) || 0,
      previewImage: previewImageMap.get(cat.Id) || null,
    })
  }

  // Copy handbook category icons to public/images/categories
  if (fs.existsSync(HANDBOOK_IMAGES_PATH)) {
    const iconFiles = fs.readdirSync(HANDBOOK_IMAGES_PATH).filter(f => f.endsWith('.png'))
    for (const icon of iconFiles) {
      const src = path.join(HANDBOOK_IMAGES_PATH, icon)
      const dst = path.join(OUTPUT_IMAGES_CATEGORIES_PATH, icon)
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst)
      }
    }
    console.log(`[categories] Copied ${iconFiles.length} category icons`)
  }

  console.log(`[categories] Built ${categories.length} categories`)
  return categories
}
