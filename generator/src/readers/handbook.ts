import fs from 'fs'
import { HANDBOOK_FILE } from '../config.js'
import type { Handbook } from '../types.js'

export function readHandbook(): Handbook {
  console.log(`[handbook] Reading ${HANDBOOK_FILE}`)
  const raw = fs.readFileSync(HANDBOOK_FILE, 'utf-8')
  const data = JSON.parse(raw) as Handbook
  console.log(`[handbook] ${data.Categories.length} categories, ${data.Items.length} items`)
  return data
}
