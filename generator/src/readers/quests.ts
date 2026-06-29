import fs from 'fs'
import path from 'path'
import { QUESTS_FILE, TRADERS_PATH } from '../config.js'

// ============ Raw SPT Quest Types ============

export interface QuestCondition {
  conditionType: string
  id: string
  index?: number
  parentId?: string
  value?: number
  target?: string | string[]
  weapon?: string[]
  weaponCaliber?: string[]
  savageRole?: string[]
  enemyEquipmentExclusive?: string[]
  enemyEquipmentInclusive?: string[]
  bodyPart?: string[]
  distance?: { compareMethod: string; value: number }
  daytime?: { from: number; to: number }
  counter?: {
    id: string
    conditions: QuestCondition[]
  }
  // For Quest prerequisites
  status?: number[]
  // For HandoverItem / FindItem
  onlyFoundInRaid?: boolean
  minDurability?: number
  maxDurability?: number
  dogtagLevel?: number
  // For Location / VisitPlace / ExitName
  [key: string]: unknown
}

export interface QuestReward {
  id: string
  type: string
  value?: number
  target?: string
  items?: Array<{
    _id: string
    _tpl: string
    upd?: Record<string, unknown>
    parentId?: string
    slotId?: string
  }>
  isHidden?: boolean
  availableInGameEditions?: string[]
  gameMode?: string[]
  [key: string]: unknown
}

export interface RawQuest {
  _id: string
  QuestName: string
  traderId: string
  type: string
  location: string
  image?: string
  description: string
  note?: string
  isKey: boolean
  restartable: boolean
  instantComplete: boolean
  canShowNotificationsInGame: boolean
  conditions: {
    AvailableForFinish: QuestCondition[]
    AvailableForStart: QuestCondition[]
    Fail: QuestCondition[]
  }
  rewards: {
    Success: QuestReward[]
    Started: QuestReward[]
    Fail: QuestReward[]
  }
}

export interface RawQuestsMap {
  [id: string]: RawQuest
}

// ============ Trader Types ============

export interface TraderBase {
  _id: string
  nickname: string
  name: string
  surname: string
  avatar?: string
}

export interface QuestAssort {
  started: Record<string, string>
  success: Record<string, string>
  fail: Record<string, string>
}

// ============ Reader Functions ============

export function readQuests(): RawQuestsMap {
  console.log(`[quests] Reading ${QUESTS_FILE}`)
  const raw = fs.readFileSync(QUESTS_FILE, 'utf-8')
  const data = JSON.parse(raw) as RawQuestsMap
  const count = Object.keys(data).length
  console.log(`[quests] Loaded ${count} quests`)
  return data
}

export function readTraders(): { bases: TraderBase[]; questAssorts: Map<string, string> } {
  console.log(`[traders] Reading trader data from ${TRADERS_PATH}`)
  const bases: TraderBase[] = []
  const questAssorts = new Map<string, string>() // questId -> traderId

  if (!fs.existsSync(TRADERS_PATH)) {
    console.warn(`[traders] ${TRADERS_PATH} not found`)
    return { bases, questAssorts }
  }

  const traderDirs = fs.readdirSync(TRADERS_PATH).filter(d => {
    const full = path.join(TRADERS_PATH, d)
    return fs.statSync(full).isDirectory()
  })

  for (const dir of traderDirs) {
    const baseFile = path.join(TRADERS_PATH, dir, 'base.json')
    const assortFile = path.join(TRADERS_PATH, dir, 'questassort.json')

    if (fs.existsSync(baseFile)) {
      const base = JSON.parse(fs.readFileSync(baseFile, 'utf-8')) as TraderBase
      bases.push(base)
    }

    if (fs.existsSync(assortFile)) {
      const assort = JSON.parse(fs.readFileSync(assortFile, 'utf-8')) as QuestAssort
      for (const phase of ['started', 'success', 'fail'] as const) {
        for (const questId of Object.keys(assort[phase] || {})) {
          questAssorts.set(questId, dir)
        }
      }
    }
  }

  console.log(`[traders] Loaded ${bases.length} traders, ${questAssorts.size} quest-trader mappings`)
  return { bases, questAssorts }
}
