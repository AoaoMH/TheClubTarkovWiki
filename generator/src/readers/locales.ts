import fs from 'fs'
import { LOCALE_CH_FILE, LOCALE_EN_FILE } from '../config.js'
import type { Locales } from '../types.js'

export function readLocales(): { zh: Locales; en: Locales } {
  console.log(`[locales] Reading locale files`)
  const zhRaw = fs.readFileSync(LOCALE_CH_FILE, 'utf-8')
  const enRaw = fs.readFileSync(LOCALE_EN_FILE, 'utf-8')
  const zh = JSON.parse(zhRaw) as Locales
  const en = JSON.parse(enRaw) as Locales
  console.log(`[locales] zh: ${Object.keys(zh).length} keys, en: ${Object.keys(en).length} keys`)
  return { zh, en }
}
