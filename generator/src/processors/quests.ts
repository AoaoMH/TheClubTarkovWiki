import type { RawQuestsMap, RawQuest, QuestCondition, QuestReward, TraderBase } from '../readers/quests.js'
import type { Locales, ItemNameEntry } from '../types.js'

// ============ Wiki Quest Output Types ============

export interface WikiQuestReward {
  type: string
  value?: number
  itemId?: string
  itemName?: { zh: string; en: string }
  quantity?: number
  target?: string // trader ID for standing, skill name, etc.
}

export interface WikiQuestObjective {
  type: string
  description: string
  value?: number
  target?: string | string[]
  targetNames?: Record<string, { zh: string; en: string }>
  weapons?: string[]
  weaponNames?: Record<string, { zh: string; en: string }>
  weaponCalibers?: string[]
  bodyParts?: string[]
  enemyRoles?: string[]
  onlyFoundInRaid?: boolean
  location?: string
  distance?: { compareMethod: string; value: number }
  daytime?: { from: number; to: number }
  // WeaponAssembly requirements
  requirements?: Array<{ stat: string; compare: string; value: number }>
  requiredItems?: string[]
  requiredItemNames?: Record<string, { zh: string; en: string }>
  requiredCategories?: string[]
  requiredCategoryNames?: Record<string, { zh: string; en: string }>
  // Avoid (fail condition)
  isFailCondition?: boolean
}

export interface WikiQuestSummary {
  id: string
  name: { zh: string; en: string }
  traderId: string
  traderName: { zh: string; en: string }
  type: string
  location: string
  rewards: WikiQuestReward[]
}

export interface WikiQuestDetail extends WikiQuestSummary {
  description: { zh: string; en: string }
  objectives: WikiQuestObjective[]
  prerequisites: Array<{ id: string; name: { zh: string; en: string } }>
  followUps: Array<{ id: string; name: { zh: string; en: string } }>
  image: string | null
  isKey: boolean
}

// ============ Task Type Translations ============

const QUEST_TYPE_ZH: Record<string, string> = {
  Elimination: '击杀',
  PickUp: '拾取',
  Completion: '交付',
  Discover: '发现',
  Loyalty: '忠诚',
  Exploration: '探索',
  Multi: '综合',
  Skill: '技能',
  Merchant: '商人',
  WeaponAssembly: '武器组装',
  Standing: '声望',
  Experience: '经验',
}

const QUEST_TYPE_EN: Record<string, string> = {
  Elimination: 'Elimination',
  PickUp: 'Pick Up',
  Completion: 'Completion',
  Discover: 'Discover',
  Loyalty: 'Loyalty',
  Exploration: 'Exploration',
  Multi: 'Multi',
  Skill: 'Skill',
  Merchant: 'Merchant',
  WeaponAssembly: 'Weapon Assembly',
  Standing: 'Standing',
  Experience: 'Experience',
}

// Location ID to name mapping (common Tarkov locations)
const LOCATION_NAMES: Record<string, { zh: string; en: string }> = {
  'any': { zh: '任意', en: 'Any' },
  '56f40101d2720b2a4d8b45d6': { zh: '海关', en: 'Customs' },
  '5704e4dad2720bb55b8b4567': { zh: '储备站', en: 'Reserve' },
  '5704e3c2d2720bac5b8b4567': { zh: '森林', en: 'Woods' },
  '5704e5fad2720bc05b8b4567': { zh: '海岸线', en: 'Shoreline' },
  '5704e554d2720bac5b8b456e': { zh: '工厂', en: 'Factory' },
  '5714dbc024597771384a510d': { zh: '立交桥', en: 'Interchange' },
  '5714dc692459777137212e12': { zh: '实验室', en: 'The Lab' },
  '59fc81d786f774390775787e': { zh: '灯塔', en: 'Lighthouse' },
  '5714db3224597771352c2e45': { zh: '街区', en: 'Streets of Tarkov' },
  '653e676a46c22c70f6031b67': { zh: '中心区', en: 'Center' },
}

// ============ Processing ============

function getTraderNames(
  traderId: string,
  traderBases: TraderBase[],
  locales: { zh: Locales; en: Locales }
): { zh: string; en: string } {
  const base = traderBases.find(b => b._id === traderId)
  if (!base) return { zh: traderId, en: traderId }

  const nicknameKey = `${traderId} Nickname`
  const zhName = locales.zh[nicknameKey] || base.nickname || traderId
  const enName = locales.en[nicknameKey] || base.nickname || traderId
  return { zh: zhName, en: enName }
}

function getLocationName(locationId: string): { zh: string; en: string } {
  return LOCATION_NAMES[locationId] || { zh: locationId, en: locationId }
}

function resolveItemName(
  id: string,
  itemNames: Record<string, ItemNameEntry>,
  locales: { zh: Locales; en: Locales }
): { zh: string; en: string } {
  const entry = itemNames[id]
  if (entry) return { zh: entry.zh, en: entry.en }
  // Fallback to locale
  const zh = locales.zh[`${id} Name`] || locales.zh[`${id} ShortName`] || id
  const en = locales.en[`${id} Name`] || locales.en[`${id} ShortName`] || id
  return { zh, en }
}

function resolveNamesMap(
  ids: string[],
  itemNames: Record<string, ItemNameEntry>,
  locales: { zh: Locales; en: Locales }
): Record<string, { zh: string; en: string }> {
  const result: Record<string, { zh: string; en: string }> = {}
  for (const id of ids) {
    result[id] = resolveItemName(id, itemNames, locales)
  }
  return result
}

function parseObjectives(
  conditions: QuestCondition[],
  itemNames: Record<string, ItemNameEntry>,
  locales: { zh: Locales; en: Locales }
): WikiQuestObjective[] {
  const objectives: WikiQuestObjective[] = []

  for (const cond of conditions) {
    if (cond.conditionType === 'CounterCreator' && cond.counter) {
      const objectiveType = (cond as any).type || 'Counter'
      const innerConditions = cond.counter.conditions || []

      // Merge all inner conditions into ONE objective
      const obj: WikiQuestObjective = {
        type: objectiveType,
        description: `${objectiveType}: Kills`,
        value: cond.value,
      }

      // Collect all data from inner conditions
      for (const inner of innerConditions) {
        if (inner.conditionType === 'Kills') {
          if (inner.target) {
            obj.target = inner.target
            const ids = Array.isArray(inner.target) ? inner.target : [inner.target]
            obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
          }
          if (inner.weapon && inner.weapon.length > 0) {
            obj.weapons = inner.weapon
            obj.weaponNames = resolveNamesMap(inner.weapon, itemNames, locales)
          }
          if (inner.weaponCaliber && inner.weaponCaliber.length > 0) obj.weaponCalibers = inner.weaponCaliber
          if (inner.bodyPart && inner.bodyPart.length > 0) obj.bodyParts = inner.bodyPart
          if (inner.savageRole && inner.savageRole.length > 0) obj.enemyRoles = inner.savageRole
          if (inner.distance && inner.distance.value > 0) obj.distance = inner.distance
          if (inner.daytime && (inner.daytime.from !== 0 || inner.daytime.to !== 0)) obj.daytime = inner.daytime
        } else if (inner.conditionType === 'Location') {
          // Store location as target override
          if (inner.target) {
            obj.location = Array.isArray(inner.target) ? inner.target.join(',') : String(inner.target)
          }
        } else if (inner.conditionType === 'Equipment') {
          // Mark as requiring specific equipment
          obj.description = `${objectiveType}: Kills+Equipment`
        } else {
          // Other condition types: append to description
          obj.description = `${objectiveType}: ${inner.conditionType}`
          if (inner.target) {
            obj.target = inner.target
            const ids = Array.isArray(inner.target) ? inner.target : [inner.target]
            obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
          }
        }
      }

      objectives.push(obj)
    } else if (cond.conditionType === 'HandoverItem' || cond.conditionType === 'FindItem') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        value: cond.value,
        target: cond.target,
        onlyFoundInRaid: cond.onlyFoundInRaid,
      }
      if (cond.target) {
        const ids = Array.isArray(cond.target) ? cond.target : [cond.target]
        obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'VisitPlace' || cond.conditionType === 'InZone') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        value: cond.value,
        target: cond.target,
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'ExitName' || cond.conditionType === 'ExitStatus') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        target: cond.target,
      }
      if ((cond as any).exitName) obj.description = `Exit: ${(cond as any).exitName}`
      objectives.push(obj)
    } else if (cond.conditionType === 'LeaveItemAtLocation') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        value: cond.value,
        target: cond.target,
      }
      if (cond.target) {
        const ids = Array.isArray(cond.target) ? cond.target : [cond.target]
        obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'PlaceBeacon' || cond.conditionType === 'LaunchFlare') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        target: cond.target,
      }
      if (cond.target) {
        const ids = Array.isArray(cond.target) ? cond.target : [cond.target]
        obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'Skill') {
      const obj: WikiQuestObjective = {
        type: 'Skill',
        description: `Skill: ${(cond as any).target || ''}`,
        value: cond.value,
        target: cond.target,
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'TraderStanding' || cond.conditionType === 'TraderLoyalty') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        value: cond.value,
        target: cond.target,
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'WeaponAssembly') {
      const obj: WikiQuestObjective = {
        type: 'WeaponAssembly',
        description: 'WeaponAssembly',
        target: cond.target,
      }
      // Extract target names
      if (cond.target) {
        const ids = Array.isArray(cond.target) ? cond.target : [cond.target]
        obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
      }
      // Extract stat requirements (non-zero values only)
      const statKeys = ['ergonomics', 'recoil', 'effectiveDistance', 'durability', 'magazineCapacity', 'height', 'width', 'weight', 'muzzleVelocity', 'baseAccuracy']
      const reqs: Array<{ stat: string; compare: string; value: number }> = []
      for (const key of statKeys) {
        const stat = (cond as any)[key]
        if (stat && stat.value !== 0) {
          reqs.push({ stat: key, compare: stat.compareMethod, value: stat.value })
        }
      }
      if (reqs.length > 0) obj.requirements = reqs
      // Extract required items (specific mods like suppressor)
      if ((cond as any).containsItems && (cond as any).containsItems.length > 0) {
        const itemIds: string[] = (cond as any).containsItems
        obj.requiredItems = itemIds
        obj.requiredItemNames = resolveNamesMap(itemIds, itemNames, locales)
      }
      // Extract required categories
      if ((cond as any).hasItemFromCategory && (cond as any).hasItemFromCategory.length > 0) {
        const catIds: string[] = (cond as any).hasItemFromCategory
        obj.requiredCategories = catIds
        obj.requiredCategoryNames = {}
        for (const catId of catIds) {
          const zh = locales.zh[`${catId} Name`] || locales.zh[catId] || catId
          const en = locales.en[`${catId} Name`] || locales.en[catId] || catId
          obj.requiredCategoryNames[catId] = { zh, en }
        }
      }
      objectives.push(obj)
    } else if (cond.conditionType === 'Level') {
      // Level requirements are usually prerequisites, skip for objectives
    } else if (cond.conditionType === 'Quest') {
      // Quest prerequisites handled separately
    } else if (cond.conditionType === 'Time' || cond.conditionType === 'Location' || cond.conditionType === 'HealthEffect' || cond.conditionType === 'HealthBuff' || cond.conditionType === 'Equipment' || cond.conditionType === 'Shots') {
      const obj: WikiQuestObjective = {
        type: cond.conditionType,
        description: cond.conditionType,
        value: cond.value,
        target: cond.target,
      }
      objectives.push(obj)
    }
  }

  return objectives
}

// Boss/savage role name mapping
const BOSS_ROLE_NAMES: Record<string, { zh: string; en: string }> = {
  'bossBully': { zh: 'Reshala', en: 'Reshala' },
  'bossKilla': { zh: 'Killa', en: 'Killa' },
  'bossGluhar': { zh: 'Shturman', en: 'Shturman' },
  'bossSanitar': { zh: 'Sanitar', en: 'Sanitar' },
  'bossTagilla': { zh: 'Tagilla', en: 'Tagilla' },
  'bossKnight': { zh: 'Knight', en: 'Knight' },
  'bossZryachiy': { zh: 'Zryachiy', en: 'Zryachiy' },
  'bossBoar': { zh: 'Kaban', en: 'Kaban' },
  'bossBoarSniper': { zh: 'Kaban 狙击手', en: 'Kaban Sniper' },
  'bossKolontay': { zh: 'Kolontay', en: 'Kolontay' },
  'bossKillaAgro': { zh: 'Killa (Agro)', en: 'Killa (Agro)' },
}

function parseFailConditions(
  conditions: QuestCondition[],
  itemNames: Record<string, ItemNameEntry>,
  locales: { zh: Locales; en: Locales }
): WikiQuestObjective[] {
  const objectives: WikiQuestObjective[] = []

  for (const cond of conditions) {
    if (cond.conditionType === 'CounterCreator' && cond.counter) {
      const innerConditions = cond.counter.conditions || []
      const objectiveType = (cond as any).type || 'Counter'

      const obj: WikiQuestObjective = {
        type: objectiveType === 'Elimination' || objectiveType === 'Completion' ? 'Avoid' : objectiveType,
        description: `Avoid: ${objectiveType}`,
        value: cond.value,
        isFailCondition: true,
      }

      for (const inner of innerConditions) {
        if (inner.conditionType === 'Kills') {
          if (inner.target) {
            obj.target = inner.target
            const ids = Array.isArray(inner.target) ? inner.target : [inner.target]
            obj.targetNames = resolveNamesMap(ids.filter(t => typeof t === 'string') as string[], itemNames, locales)
          }
          if (inner.savageRole && inner.savageRole.length > 0) {
            obj.enemyRoles = inner.savageRole
          }
          if (inner.weapon && inner.weapon.length > 0) {
            obj.weapons = inner.weapon
            obj.weaponNames = resolveNamesMap(inner.weapon, itemNames, locales)
          }
        } else if (inner.conditionType === 'Location') {
          if (inner.target) {
            obj.location = Array.isArray(inner.target) ? inner.target.join(',') : String(inner.target)
          }
        } else if (inner.conditionType === 'ExitStatus') {
          obj.description = `Avoid: ExitStatus`
          obj.target = inner.target
        } else if (inner.conditionType === 'Shots') {
          obj.description = `Avoid: Shots`
          if (inner.savageRole && inner.savageRole.length > 0) {
            obj.enemyRoles = inner.savageRole
          }
        } else {
          obj.description = `Avoid: ${inner.conditionType}`
          if (inner.target) {
            obj.target = inner.target
          }
        }
      }

      // Skip Quest-type fail conditions (they are prerequisite relationships)
      if (obj.type !== 'Quest') {
        objectives.push(obj)
      }
    }
  }

  return objectives
}

function parseRewards(
  rewards: QuestReward[],
  locales: { zh: Locales; en: Locales },
  itemNames: Record<string, ItemNameEntry>
): WikiQuestReward[] {
  const result: WikiQuestReward[] = []

  for (const r of rewards) {
    const reward: WikiQuestReward = { type: r.type }

    switch (r.type) {
      case 'Experience':
        reward.value = r.value
        break

      case 'TraderStanding':
      case 'TraderStandingRestore':
        reward.target = r.target
        reward.value = r.value
        break

      case 'Item':
        reward.value = r.value
        if (r.items && r.items.length > 0) {
          const rootItems = r.items.filter(i => !i.parentId)
          if (rootItems.length > 0) {
            const tpl = rootItems[0]._tpl
            reward.itemId = tpl
            reward.itemName = resolveItemName(tpl, itemNames, locales)
            const stackCount = (rootItems[0].upd as any)?.StackObjectsCount
            reward.quantity = typeof stackCount === 'number' ? stackCount : (r.value || 1)
          }
        }
        break

      case 'Skill':
        reward.target = r.target
        reward.value = r.value
        break

      case 'AssortmentUnlock':
      case 'ProductionScheme':
        // These have complex item arrays, simplify
        if (r.items && r.items.length > 0) {
          const rootItems = r.items.filter(i => !i.parentId)
          if (rootItems.length > 0) {
            reward.itemId = rootItems[0]._tpl
            reward.itemName = resolveItemName(rootItems[0]._tpl, itemNames, locales)
          }
        }
        break

      case 'TraderUnlock':
        reward.target = r.target
        break

      case 'Achievement':
        reward.target = r.target
        break

      default:
        break
    }

    result.push(reward)
  }

  return result
}

export function processQuests(
  rawQuests: RawQuestsMap,
  traderBases: TraderBase[],
  locales: { zh: Locales; en: Locales },
  itemNames: Record<string, ItemNameEntry>
): { summaries: WikiQuestSummary[]; details: Map<string, WikiQuestDetail> } {
  console.log('[quests] Processing quests...')

  const summaries: WikiQuestSummary[] = []
  const details = new Map<string, WikiQuestDetail>()

  // Build prerequisite map: questId -> [prerequisite quest IDs]
  const prereqMap = new Map<string, string[]>()
  // Build reverse map: questId -> [follow-up quest IDs]
  const followUpMap = new Map<string, string[]>()

  for (const [questId, quest] of Object.entries(rawQuests)) {
    const startConds = quest.conditions.AvailableForStart || []
    const prereqs: string[] = []
    for (const cond of startConds) {
      if (cond.conditionType === 'Quest' && cond.target && typeof cond.target === 'string') {
        prereqs.push(cond.target)
      }
    }
    prereqMap.set(questId, prereqs)

    // Build reverse mapping
    for (const prereqId of prereqs) {
      const followUps = followUpMap.get(prereqId) || []
      followUps.push(questId)
      followUpMap.set(prereqId, followUps)
    }
  }

  for (const [questId, quest] of Object.entries(rawQuests)) {
    const traderName = getTraderNames(quest.traderId, traderBases, locales)
    const questNameZh = locales.zh[`${questId} name`] || quest.QuestName
    const questNameEn = locales.en[`${questId} name`] || quest.QuestName
    const questDescZh = locales.zh[`${questId} description`] || ''
    const questDescEn = locales.en[`${questId} description`] || ''

    const rewards = parseRewards(quest.rewards?.Success || [], locales, itemNames)
    const objectives = parseObjectives(quest.conditions.AvailableForFinish || [], itemNames, locales)
    const failObjectives = parseFailConditions(quest.conditions.Fail || [], itemNames, locales)
    // Append fail conditions as objectives
    objectives.push(...failObjectives)

    const summary: WikiQuestSummary = {
      id: questId,
      name: { zh: questNameZh, en: questNameEn },
      traderId: quest.traderId,
      traderName,
      type: quest.type,
      location: quest.location,
      rewards,
    }

    // Prerequisites
    const prereqs = (prereqMap.get(questId) || []).map(id => ({
      id,
      name: {
        zh: locales.zh[`${id} name`] || rawQuests[id]?.QuestName || id,
        en: locales.en[`${id} name`] || rawQuests[id]?.QuestName || id,
      },
    }))

    // Follow-ups
    const followUps = (followUpMap.get(questId) || []).map(id => ({
      id,
      name: {
        zh: locales.zh[`${id} name`] || rawQuests[id]?.QuestName || id,
        en: locales.en[`${id} name`] || rawQuests[id]?.QuestName || id,
      },
    }))

    const detail: WikiQuestDetail = {
      ...summary,
      description: { zh: questDescZh, en: questDescEn },
      objectives,
      prerequisites: prereqs,
      followUps,
      image: quest.image || null,
      isKey: quest.isKey,
    }

    summaries.push(summary)
    details.set(questId, detail)
  }

  console.log(`[quests] Processed ${summaries.length} quests, ${details.size} details`)
  return { summaries, details }
}
