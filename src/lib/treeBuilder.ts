import { SpellTreeData, SpellSchool, SpellNode } from '@/types/spell-tree'

export interface ScanEffect {
  name: string
  area?: number
  duration?: number
  magnitude?: number
  description?: string
}

export interface ScanSpell {
  formId: string
  name: string
  school: string
  skillLevel: string
  minimumSkill?: number
  effects?: ScanEffect[]
  keywords?: string[]
  magickaCost?: number
  castingType?: string
  delivery?: string
  persistentId?: string
  plugin?: string
  editorId?: string
  tomeFormId?: string
  tomeName?: string
}

export interface SpellScanOutput {
  llmPrompt?: string
  scanTimestamp?: string
  spellCount?: number
  spells: ScanSpell[]
}

export const SKILL_RANK: Record<string, number> = {
  Novice: 1,
  Apprentice: 2,
  Adept: 3,
  Expert: 4,
  Master: 5,
}

const SCHOOL_COLORS: Record<string, string> = {
  Destruction: '#ef4444',
  Conjuration: '#a855f7',
  Illusion: '#3b82f6',
  Restoration: '#eab308',
  Alteration: '#f97316',
}

const schoolColor = (name: string) => SCHOOL_COLORS[name] || '#94a3b8'

const rankOf = (s: ScanSpell) => SKILL_RANK[s.skillLevel] ?? 99
const isVanilla = (formId: string) => formId.toLowerCase().startsWith('0x00')

// Coarse theme used both for grouping children and as the node's display theme.
function classifyTheme(spell: ScanSpell): string {
  const school = spell.school
  const text = (
    spell.name +
    ' ' +
    (spell.effects ?? []).map(e => e.name).join(' ') +
    ' ' +
    (spell.keywords ?? []).join(' ')
  ).toLowerCase()

  if (school === 'Destruction') {
    if (text.includes('frost')) return 'Frost'
    if (text.includes('shock')) return 'Shock'
    if (text.includes('fire')) return 'Fire'
    return 'Other'
  }
  if (school === 'Conjuration') {
    if (text.includes('daedra') || text.includes('dremora')) return 'Daedra'
    if (text.includes('atronach')) return 'Atronach'
    if (text.includes('undead') || text.includes('reanimate') || text.includes('zombie') || text.includes('corpse')) return 'Undead'
    if (text.includes('bound') || text.includes('sword') || text.includes('battleaxe') || text.includes('bow')) return 'Bound'
    return 'Other'
  }
  if (school === 'Illusion') {
    if (text.includes('fear') || text.includes('terror')) return 'Fear'
    if (text.includes('calm')) return 'Calm'
    if (text.includes('frenzy') || text.includes('rout')) return 'Frenzy'
    if (text.includes('invis')) return 'Invisibility'
    if (text.includes('muffle')) return 'Muffle'
    return 'Other'
  }
  if (school === 'Alteration') {
    if (text.includes('armor') || text.includes('flesh') || text.includes('shield')) return 'Armor'
    if (text.includes('paralys')) return 'Paralysis'
    if (text.includes('light') || text.includes('candle') || text.includes('magelight')) return 'Light'
    if (text.includes('transmute')) return 'Transmute'
    if (text.includes('detect')) return 'Detect'
    return 'Other'
  }
  if (school === 'Restoration') {
    if (text.includes('heal')) return 'Healing'
    if (text.includes('turn') || text.includes('undead') || text.includes('banish')) return 'Turn Undead'
    if (text.includes('ward')) return 'Wards'
    return 'Other'
  }
  return 'Other'
}

export const NODE_SPACING = 100
export const MIN_RING_GAP = 35
export const MAX_RING_GAP = 80
export const MIN_CORE_GAP = 100

function layoutRadial(nodesById: Record<string, SpellNode>, rootId: string, a0: number, a1: number) {
  const sectorWidth = a1 - a0

  const depthOf: Record<string, number> = { [rootId]: 0 }
  const order: string[] = []
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift() as string
    order.push(id)
    const d = depthOf[id]
    for (const c of nodesById[id].children) {
      depthOf[c] = d + 1
      queue.push(c)
    }
  }

  const tierOrder: number[] = []
  const tierNodes: Record<number, string[]> = {}
  for (const id of order) {
    const t = nodesById[id].tier
    if (!tierNodes[t]) {
      tierNodes[t] = []
      tierOrder.push(t)
    }
    tierNodes[t].push(id)
  }

  tierOrder.sort((a, b) => a - b)

  let currentRadius = 0
  let isFirstTier = true
  for (const tier of tierOrder) {
    const ids = tierNodes[tier]
    let ringRadius = isFirstTier ? MIN_CORE_GAP : currentRadius + MIN_RING_GAP
    let idx = 0
    while (idx < ids.length) {
      const capacity = Math.max(1, Math.floor((ringRadius * sectorWidth) / NODE_SPACING))
      const count = Math.min(capacity, ids.length - idx)
      for (let i = 0; i < count; i++) {
        const a = a0 + ((i + 0.5) / count) * sectorWidth
        nodesById[ids[idx]].x = Math.round(ringRadius * Math.cos(a))
        nodesById[ids[idx]].y = Math.round(ringRadius * Math.sin(a))
        idx++
      }
      ringRadius += MIN_RING_GAP
    }
    currentRadius = ringRadius - MIN_RING_GAP + MAX_RING_GAP
    isFirstTier = false
  }
}

export function relayoutTree(data: SpellTreeData): SpellTreeData {
  const schools = { ...data.schools }
  const schoolNames = Object.keys(schools)

  const counts: Record<string, number> = {}
  let totalNodes = 0
  for (const name of schoolNames) {
    const count = schools[name].nodes?.length || 0
    counts[name] = count
    totalNodes += count
  }

  let angleCursor = -Math.PI / 2 + Math.PI / 12
  const sectorOf: Record<string, { a0: number; a1: number }> = {}
  for (const name of schoolNames) {
    const a0 = angleCursor
    const a1 = angleCursor + (counts[name] / Math.max(1, totalNodes)) * 2 * Math.PI
    sectorOf[name] = { a0, a1 }
    angleCursor = a1
  }

  for (const schoolName of schoolNames) {
    const school = schools[schoolName]
    if (!school.nodes || school.nodes.length === 0) continue

    const nodesById: Record<string, SpellNode> = {}
    for (const node of school.nodes) {
      nodesById[node.formId] = { ...node, schoolColor: node.schoolColor || schoolColor(schoolName) }
    }

    const rootId = (school.roots && school.roots[0]) || school.nodes[0].formId
    const { a0, a1 } = sectorOf[schoolName]

    layoutRadial(nodesById, rootId, a0, a1)

    const deg = (rad: number) => (rad * 180) / Math.PI
    schools[schoolName] = {
      roots: [rootId],
      layoutStyle: 'tier_first',
      nodes: Object.values(nodesById),
      spokeAngle: deg(a1 - a0) / Math.max(1, nodesById[rootId].children.length),
      startAngle: deg(a0),
      endAngle: deg(a1),
      rootDirection: deg((a0 + a1) / 2),
    }
  }

  return { ...data, schools }
}

export function rebuildTree(data: SpellTreeData, randomize: boolean): SpellTreeData {
  const schools = { ...data.schools }

  for (const schoolName of Object.keys(schools)) {
    const school = schools[schoolName]
    if (!school.nodes || school.nodes.length === 0) continue

    const sorted = [...school.nodes].sort((a, b) => {
      const va = isVanilla(a.formId) ? 0 : 1
      const vb = isVanilla(b.formId) ? 0 : 1
      if (va !== vb) return va - vb
      return a.formId.localeCompare(b.formId)
    })

    const seen = new Set<string>()
    const nodes = sorted.filter(n => {
      const key = n.name.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const nodesById: Record<string, SpellNode> = {}

    for (const node of nodes) {
      nodesById[node.formId] = {
        ...node,
        children: [],
        prerequisites: [],
        hardPrereqs: [],
        softPrereqs: [],
        softNeeded: 0,
        isRoot: false,
      }
    }

    let rootId = school.roots?.[0]
    if (!rootId || !nodesById[rootId]) {
      const ranked = [...nodes].sort((a, b) => {
        const ra = (SKILL_RANK[a.skillLevel] || 99) - (SKILL_RANK[b.skillLevel] || 99)
        if (ra !== 0) return ra
        return (isVanilla(a.formId) ? 0 : 1) - (isVanilla(b.formId) ? 0 : 1)
      })
      rootId = ranked[0]?.formId
    }

    if (!rootId || !nodesById[rootId]) continue

    nodesById[rootId].isRoot = true

    const placed: string[] = [rootId]
    const unplaced = nodes.filter(n => n.formId !== rootId)

    for (const u of unplaced) {
      const uNode = nodesById[u.formId]
      const uRank = SKILL_RANK[u.skillLevel] || 99
      const uTheme = uNode.theme

      const eligible = placed
        .map(id => nodesById[id])
        .filter(n => n.children.length < 3)
        .filter(n => (SKILL_RANK[n.skillLevel] || 99) <= uRank)

      let parent: SpellNode

      if (randomize) {
        const candidates: { node: SpellNode; weight: number }[] = []

        const themeMatch = eligible.filter(n => n.theme === uTheme)
        if (themeMatch.length > 0) {
          candidates.push(...themeMatch.map(n => ({ node: n, weight: 3 })))
        }
        const otherEligible = eligible.filter(n => n.theme !== uTheme)
        candidates.push(...otherEligible.map(n => ({ node: n, weight: 1 })))

        if (candidates.length === 0) {
          const fallback = placed
            .map(id => nodesById[id])
            .filter(n => n.children.length < 3)
          candidates.push(...fallback.map(n => ({ node: n, weight: 1 })))
        }

        if (candidates.length === 0) {
          parent = nodesById[rootId]
        } else {
          const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0)
          let r = Math.random() * totalWeight
          for (const c of candidates) {
            r -= c.weight
            if (r <= 0) {
              parent = c.node
              break
            }
          }
          if (!parent) parent = candidates[0].node
        }
      } else {
        const themeMatch = eligible.filter(n => n.theme === uTheme)
        const pool = themeMatch.length > 0 ? themeMatch : eligible
        const sorted = [...pool].sort((a, b) => {
          const ra = (SKILL_RANK[a.skillLevel] || 99) - (SKILL_RANK[b.skillLevel] || 99)
          if (ra !== 0) return ra
          return a.formId.localeCompare(b.formId)
        })
        parent = sorted[0] ?? eligible[0] ?? placed.map(id => nodesById[id]).find(n => n.children.length < 3) ?? nodesById[rootId]
      }

      parent.children.push(u.formId)
      uNode.prerequisites.push(parent.formId)
      uNode.softPrereqs.push(parent.formId)
      uNode.softNeeded = uNode.softPrereqs.length
      placed.push(u.formId)
    }

    schools[schoolName] = {
      ...school,
      nodes: Object.values(nodesById),
      roots: [rootId],
    }
  }

  return relayoutTree({ ...data, schools })
}

export function buildTreeFromScan(scan: SpellScanOutput): SpellTreeData {
  const schoolsOut: Record<string, SpellSchool> = {}
  const schoolsMap: Record<string, ScanSpell[]> = {}

  for (const s of scan.spells) {
    if (!s.formId || !s.school) continue
    // Only keep spells learned from a book/tome (the scanner tags these with
    // a tomeFormId referencing the teaching book).
    if (!s.tomeFormId) continue
    const list = schoolsMap[s.school] || (schoolsMap[s.school] = [])
    if (list.some(e => e.formId === s.formId)) continue // dedupe
    list.push(s)
  }

  // Divide the combined radial into one sector per school, each sector's angular
  // width proportional to that school's spell count.
  const schoolNames = Object.keys(schoolsMap)
  const totalSpells = schoolNames.reduce((sum, n) => sum + schoolsMap[n].length, 0) || 1
  const sectorOf: Record<string, { a0: number; a1: number }> = {}
  let angleCursor = -Math.PI / 2 + Math.PI / 12
  for (const name of schoolNames) {
    const a0 = angleCursor
    const a1 = angleCursor + (schoolsMap[name].length / totalSpells) * 2 * Math.PI
    sectorOf[name] = { a0, a1 }
    angleCursor = a1
  }

  for (const schoolName of Object.keys(schoolsMap)) {
    const spells = schoolsMap[schoolName]
    // Sort by rank asc, vanilla preferred, then formId — first entry becomes root.
    const sorted = [...spells].sort((a, b) => {
      const r = rankOf(a) - rankOf(b)
      if (r !== 0) return r
      const v = (isVanilla(a.formId) ? 0 : 1) - (isVanilla(b.formId) ? 0 : 1)
      if (v !== 0) return v
      return a.formId.localeCompare(b.formId)
    })

    const root = sorted[0]
    const nodesById: Record<string, SpellNode> = {}
    for (const s of sorted) {
      nodesById[s.formId] = {
        formId: s.formId,
        name: s.name || s.formId,
        theme: classifyTheme(s),
        skillLevel: s.skillLevel || 'Novice',
        tier: rankOf(s),
        x: 0,
        y: 0,
        children: [],
        prerequisites: [],
        hardPrereqs: [],
        softPrereqs: [],
        softNeeded: 0,
        isRoot: s.formId === root.formId,
        schoolColor: schoolColor(schoolName),
      }
    }

    const placed: ScanSpell[] = [root]
    const unplaced = sorted.filter(s => s.formId !== root.formId)

    for (const u of unplaced) {
      const node = nodesById[u.formId]
      // Eligible parents: already placed, not above this spell's rank, under 3 children.
      const eligible = placed.filter(
        p => rankOf(p) <= rankOf(u) && nodesById[p.formId].children.length < 3
      )
      const parent =
        eligible.find(p => classifyTheme(p) === classifyTheme(u)) ??
        eligible[0] ??
        placed.find(p => nodesById[p.formId].children.length < 3) ??
        root

      const pNode = nodesById[parent.formId]
      pNode.children.push(u.formId)
      node.prerequisites.push(parent.formId)
      node.softPrereqs.push(parent.formId)
      node.softNeeded = node.softPrereqs.length
      placed.push(u)
    }

    layoutRadial(nodesById, root.formId, sectorOf[schoolName].a0, sectorOf[schoolName].a1)

    const { a0, a1 } = sectorOf[schoolName]
    const deg = (rad: number) => (rad * 180) / Math.PI
    schoolsOut[schoolName] = {
      roots: [root.formId],
      layoutStyle: 'tier_first',
      nodes: Object.values(nodesById),
      spokeAngle: deg(a1 - a0) / Math.max(1, nodesById[root.formId].children.length),
      startAngle: deg(a0),
      endAngle: deg(a1),
      rootDirection: deg((a0 + a1) / 2),
    }
  }

  return {
    version: '1.0',
    generator: 'HoM Tree Builder',
    generatedAt: new Date().toISOString(),
    trustPrereqs: true,
    noRotate: false,
    layoutMode: 'sun',
    config: { density: 0.6, shape: 'tier_first', symmetry: 0.3 },
    schools: schoolsOut,
    seed: Date.now(),
  }
}
