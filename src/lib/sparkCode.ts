/**
 * WeaponBuildMaster (WBM) Spark Code encoder/decoder.
 * Ported from F:\HTML\Tarkov\WeaponBuildMaster\PresetCodeUtils.cs + EditBuildScreenShowPatch.cs
 *
 * Config code format: SPT-ProjectSpark-WBM-{base64}
 * Each node = 15 bytes: 12B(tpl) + 1B(selfIndex) + 1B(parentIndex) + 1B(slotIndex)
 * Root node: parentIndex=255, slotIndex=255
 * Child node: slotIndex = position in parent's Slots array + 1
 */
import type { GunInitData, GunSlot } from '@/lib/forgeApi'

// --- Types ---

interface RawWeaponNode {
  tpl: string         // 24-char hex MongoId
  parentIndex: number // array index of parent, -1 for root
  slotIndex: number   // slot position + 1, 0 for root
}

// --- Hex <-> Bytes ---

/** Convert 24-char hex string to 12 bytes (mirrors C# HexStringToBytes) */
function hexToBytes(hex: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < 12; i++) {
    bytes.push(parseInt(hex.substring(i * 2, i * 2 + 2), 16))
  }
  return bytes
}

/** Convert 12 bytes back to 24-char hex string (mirrors C# BytesToHexString) */
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

// --- Base64 helpers (chunked to avoid stack overflow) ---

function bytesToBase64(bytes: number[]): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): number[] {
  const binary = atob(b64)
  const bytes: number[] = []
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i))
  }
  return bytes
}

// --- Tree Builder ---
// Rebuilds WBM tree from flat state (installedAttachments + childSlotsMap)
// Mirrors C# TraverseRawTree in EditBuildScreenShowPatch.cs:109-130

function buildWeaponTree(
  gunId: string,
  gunData: GunInitData,
  childSlotsMap: Record<string, GunSlot[]>,
  installedAttachments: Record<string, string>,
): RawWeaponNode[] {
  const tree: RawWeaponNode[] = []

  // Root node: tpl=gunId, parent=-1 (→255), slotIndex=0 (→255)
  tree.push({ tpl: gunId, parentIndex: -1, slotIndex: 0 })

  // DFS: traverse slots array, slotIndex = array index + 1
  function traverse(parentSlotPath: string, parentIndex: number, slots: GunSlot[]) {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (!slot) continue
      const slotPath = parentSlotPath ? `${parentSlotPath}:${slot.name}` : slot.name
      const itemId = installedAttachments[slotPath]
      if (!itemId) continue

      const nodeIndex = tree.length
      tree.push({ tpl: itemId, parentIndex, slotIndex: i + 1 })

      // Recurse into child slots of this installed item
      const childSlots = childSlotsMap[slotPath]
      if (childSlots && childSlots.length > 0) {
        traverse(slotPath, nodeIndex, childSlots)
      }
    }
  }

  // Start DFS from root weapon's top-level slots
  traverse('', 0, gunData.slots)

  return tree
}

// --- Encoder ---

/** Encode weapon tree to base64 data segment (mirrors C# EncodeSparkCode) */
function encodeTreeToBase64(tree: RawWeaponNode[]): string {
  const bytes: number[] = []

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    if (!node) continue

    // 12 bytes: tpl (hex → bytes)
    for (const b of hexToBytes(node.tpl)) bytes.push(b)

    // 1 byte: selfIndex
    bytes.push(i)

    // 1 byte: parentIndex (255 for root)
    bytes.push(node.parentIndex === -1 ? 255 : node.parentIndex)

    // 1 byte: slotIndex (255 for root)
    bytes.push(node.parentIndex === -1 ? 255 : node.slotIndex)
  }

  return bytesToBase64(bytes)
}

/**
 * Generate full WBM config code from current build state.
 * Output: SPT-ProjectSpark-WBM-{base64}\n{weaponName}
 */
export function encodeSparkCode(
  gunId: string,
  gunData: GunInitData,
  childSlotsMap: Record<string, GunSlot[]>,
  installedAttachments: Record<string, string>,
): string {
  const tree = buildWeaponTree(gunId, gunData, childSlotsMap, installedAttachments)
  const base64Data = encodeTreeToBase64(tree)
  return formatWeaponCode(base64Data, gunData.name)
}

/** Format final weapon code string */
export function formatWeaponCode(base64Data: string, weaponName: string): string {
  return `SPT-ProjectSpark-WBM-${base64Data}\n${weaponName}`
}

// --- Decoder (for future import feature) ---

export interface DecodedNode {
  tpl: string
  selfIndex: number
  parentIndex: number  // -1 for root
  slotIndex: number    // 0 for root
}

/**
 * Decode WBM config code back to node array.
 * Returns null if invalid format.
 */
export function decodeSparkCode(code: string): DecodedNode[] | null {
  try {
    const text = code.trim()
    let base64Data = text

    // Extract first line, strip prefix
    const lines = text.split(/[\r\n]/).filter(l => l.length > 0)
    if (lines.length > 0) {
      const firstLine = lines[0]
      if (!firstLine) return null
      const prefix = 'SPT-ProjectSpark-WBM-'
      if (firstLine.startsWith(prefix)) {
        base64Data = firstLine.substring(prefix.length)
      } else {
        base64Data = firstLine
      }
    }

    const data = base64ToBytes(base64Data)

    // Validate: 15 bytes per node
    if (data.length % 15 !== 0) return null

    const nodes: DecodedNode[] = []
    const nodeCount = data.length / 15

    for (let i = 0; i < nodeCount; i++) {
      const offset = i * 15

      // 12 bytes: tpl
      const tplBytes = data.slice(offset, offset + 12)
      const tpl = bytesToHex(tplBytes)

      // 1 byte each: selfIndex, parentIndex, slotIndex
      const selfIndex = data[offset + 12] ?? 0
      const parentIndex = data[offset + 13] ?? 0
      const slotIndex = data[offset + 14] ?? 0

      nodes.push({
        tpl,
        selfIndex,
        parentIndex: parentIndex === 255 ? -1 : parentIndex,
        slotIndex: slotIndex === 255 ? 0 : slotIndex,
      })
    }

    return nodes
  } catch {
    return null
  }
}
