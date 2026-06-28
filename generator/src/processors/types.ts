import type { SPTItemsMap, WikiTypeNode } from '../types.js'

/**
 * Build the type hierarchy tree from items.json.
 * Node entries (_type=Node) define the type hierarchy.
 * Item entries inherit types through _parent.
 */
export function buildTypeHierarchy(items: SPTItemsMap): {
  typeNodes: Map<string, WikiTypeNode>
  itemTypeMap: Map<string, string> // itemId -> resolved type name
  typeChain: (itemId: string) => string[]
} {
  const typeNodes = new Map<string, WikiTypeNode>()
  const nodeIds = new Set<string>()

  // First pass: collect all Node entries (type definitions)
  for (const [id, item] of Object.entries(items)) {
    if (item._type === 'Node') {
      nodeIds.add(id)
      typeNodes.set(id, {
        id,
        name: item._name,
        parentId: item._parent,
        children: [],
      })
    }
  }

  // Second pass: build children relationships
  for (const [id, node] of typeNodes) {
    if (node.parentId && typeNodes.has(node.parentId)) {
      typeNodes.get(node.parentId)!.children.push(id)
    }
  }

  // Resolve type for each item by walking up the _parent chain
  const itemTypeMap = new Map<string, string>()

  function resolveType(itemId: string): string {
    if (itemTypeMap.has(itemId)) return itemTypeMap.get(itemId)!

    const item = items[itemId]
    if (!item) return 'Unknown'

    // If this is a Node, its type is its own name
    if (item._type === 'Node') {
      itemTypeMap.set(itemId, item._name)
      return item._name
    }

    // Walk up parent chain to find the closest Node ancestor
    let current = item._parent
    while (current && items[current]) {
      if (items[current]!._type === 'Node') {
        const typeName = items[current]!._name
        itemTypeMap.set(itemId, typeName)
        return typeName
      }
      current = items[current]!._parent
    }

    itemTypeMap.set(itemId, 'Unknown')
    return 'Unknown'
  }

  // Resolve types for all non-Node items
  for (const id of Object.keys(items)) {
    if (!nodeIds.has(id)) {
      resolveType(id)
    }
  }

  // Get the full type chain for an item
  function typeChain(itemId: string): string[] {
    const chain: string[] = []
    let current = items[itemId]?._parent
    while (current && items[current]) {
      if (items[current]!._type === 'Node') {
        chain.push(items[current]!._name)
      }
      current = items[current]!._parent
    }
    return chain
  }

  return { typeNodes, itemTypeMap, typeChain }
}
