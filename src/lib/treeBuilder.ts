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

function createRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const SKILL_RANK: Record<string, number> = {
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

const rankOf = (s: any) => SKILL_RANK[s.skillLevel] ?? 99
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

function classifySpellByName(name: string): string {
  const lower = name.toLowerCase()

  if (/\b(fire|flame|burn|incinerate|firebolt|fireball|flamecloak|cloak|wall\s+of\s+flame)\b/.test(lower)) return 'Fire'
  if (/\b(frost|ice|cold|freeze|icy|frostbite|icy\s+spear|wall\s+of\s+frost)\b/.test(lower)) return 'Frost'
  if (/\b(shock|lightning|thunder|storm|spark|wall\s+of\s+lightning)\b/.test(lower)) return 'Shock'
  if (/\b(heal|restore|cure|regeneration|healing)\b/.test(lower)) return 'Healing'
  if (/\b(ward|resist|protection)\b/.test(lower)) return 'Wards'
  if (/\b(turn|banish|undead|dispel)\b/.test(lower)) return 'Turn Undead'
  if (/\b(summon|conjure|familiar|dremora|atronach|reanimate|zombie|corpse|raise)\b/.test(lower)) return 'Summoning'
  if (/\b(bound|sword|battleaxe|bow|axe)\b/.test(lower)) return 'Bound'
  if (/\b(detect|reveal|see|sense|life|dead)\b/.test(lower)) return 'Detection'
  if (/\b(fear|terror|courage|calm|frenzy|rout|pacify|mind)\b/.test(lower)) return 'Mind'
  if (/\b(invis|muffle|sneak|hide|step)\b/.test(lower)) return 'Stealth'
  if (/\b(armor|flesh|shield|oak|stone|hide|dragonhide|mage)\b/.test(lower)) return 'Armor'
  if (/\b(paralys|paralyze|stun|immobilize)\b/.test(lower)) return 'Paralysis'
  if (/\b(transmute|ore|iron|gold|silver)\b/.test(lower)) return 'Transmute'
  if (/\b(light|candle|magelight|torch|sun)\b/.test(lower)) return 'Light'
  if (/\b(daedra|dremora)\b/.test(lower)) return 'Daedra'
  if (/\b(atronach)\b/.test(lower)) return 'Atronach'

  return 'Other'
}

const NODE_SPACING = 100
const MIN_RING_GAP = 35
const MAX_RING_GAP = 80
const MIN_CORE_GAP = 100

function layoutRadial(nodesById: Record<string, SpellNode>, rootIds: string[], a0: number, a1: number) {
  const sectorWidth = a1 - a0

  const depthOf: Record<string, number> = {}
  const order: string[] = []
  const queue: string[] = [...rootIds]
  for (const rid of rootIds) {
    depthOf[rid] = 0
  }
  while (queue.length) {
    const id = queue.shift() as string
    order.push(id)
    const d = depthOf[id]
    for (const c of nodesById[id].children) {
      if (depthOf[c] === undefined) {
        depthOf[c] = d + 1
        queue.push(c)
      }
    }
  }

  const tierOrder: number[] = []
  const tierNodes: Record<number, string[]> = {}
  for (const id of order) {
    const d = nodesById[id].tier
    if (!tierNodes[d]) {
      tierNodes[d] = []
      tierOrder.push(d)
    }
    tierNodes[d].push(id)
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

export interface TreeBuildRules {
  tierGap: 1 | 2 | 3 | 4
  maxChildren: number
  rootCount: number
  themeMatching: boolean
  seed: number | 'random'
}

export function buildTreeFromScan(scan: SpellScanOutput, rules?: Partial<TreeBuildRules>): SpellTreeData {
  const seed = rules?.seed === 'random' || rules?.seed === undefined ? Math.floor(Math.random() * 2**32) : (rules?.seed as number)
  const rng = createRng(seed)
  const maxChildren = rules?.maxChildren || 3
  const tierGap = rules?.tierGap || 1
  const rootCount = Math.max(1, rules?.rootCount || 1)
  const themeMatching = rules?.themeMatching !== false
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
  let angleCursor = -Math.PI / 2
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

    const roots = sorted.slice(0, rootCount)
    const nodesById: Record<string, SpellNode> = {}
    for (const s of sorted) {
      nodesById[s.formId] = {
        formId: s.formId,
        name: s.name || s.formId,
        theme: classifySpellByName(s.name),
        skillLevel: s.skillLevel || 'Novice',
        tier: rankOf(s),
        x: 0,
        y: 0,
        children: [],
        prerequisites: [],
        hardPrereqs: [],
        softPrereqs: [],
        softNeeded: 0,
        isRoot: roots.some(r => r.formId === s.formId),
        schoolColor: schoolColor(schoolName),
      }
    }

    const placed: ScanSpell[] = [...roots]
    const unplaced = sorted.filter(s => !roots.some(r => r.formId === s.formId))

    for (const u of unplaced) {
      const node = nodesById[u.formId]
      const uRank = rankOf(u)
      const eligible = placed.filter(
        p => {
          const pRank = rankOf(p)
          const tierOk = pRank >= uRank - tierGap && pRank <= uRank
          return tierOk && nodesById[p.formId].children.length < maxChildren
        }
      )
      const parent = (() => {
        const themeMatches = eligible.filter(p => classifySpellByName(p.name) === classifySpellByName(u.name))
        if (themeMatching && themeMatches.length > 0) {
          return themeMatches[Math.floor(rng() * themeMatches.length)]
        }
        if (eligible.length > 0) {
          return eligible[Math.floor(rng() * eligible.length)]
        }
      const fallback = placed.slice().reverse().find(p => nodesById[p.formId].children.length < maxChildren && (rankOf(p) >= uRank - tierGap && rankOf(p) <= uRank))
      if (fallback) return fallback
      return roots[0]
    })()

      const pNode = nodesById[parent.formId]
      pNode.children.push(u.formId)
      node.prerequisites.push(parent.formId)
      node.softPrereqs.push(parent.formId)
      node.softNeeded = node.softPrereqs.length
      placed.push(u)
    }

    layoutRadial(nodesById, roots.map(r => r.formId), sectorOf[schoolName].a0, sectorOf[schoolName].a1)

    const { a0, a1 } = sectorOf[schoolName]
    const deg = (rad: number) => (rad * 180) / Math.PI
    schoolsOut[schoolName] = {
      roots: roots.map(r => r.formId),
      layoutStyle: 'tier_first',
      nodes: Object.values(nodesById),
      spokeAngle: deg(a1 - a0) / Math.max(1, roots.length),
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

export function rebuildTreeFromData(data: SpellTreeData, rules?: Partial<TreeBuildRules>): SpellTreeData {
  const seed = rules?.seed === 'random' || rules?.seed === undefined ? Math.floor(Math.random() * 2**32) : (rules?.seed as number)
  const rng = createRng(seed)
  const maxChildren = rules?.maxChildren || 3
  const tierGap = rules?.tierGap || 1
  const rootCount = Math.max(1, rules?.rootCount || 1)
  const themeMatching = rules?.themeMatching !== false
  const schoolsMap: Record<string, SpellNode[]> = {}

  for (const schoolName in data.schools) {
    const school = data.schools[schoolName]
    if (Array.isArray(school.nodes)) {
      schoolsMap[schoolName] = school.nodes.map(n => ({ ...n }))
    }
  }

  const schoolsOut: Record<string, SpellSchool> = {}
  const schoolNames = Object.keys(schoolsMap)
  const totalSpells = schoolNames.reduce((sum, n) => sum + schoolsMap[n].length, 0) || 1
  const sectorOf: Record<string, { a0: number; a1: number }> = {}
  let angleCursor = -Math.PI / 2
  for (const name of schoolNames) {
    const a0 = angleCursor
    const a1 = angleCursor + (schoolsMap[name].length / totalSpells) * 2 * Math.PI
    sectorOf[name] = { a0, a1 }
    angleCursor = a1
  }

  for (const schoolName of schoolNames) {
    const spells = schoolsMap[schoolName]
    const sorted = [...spells].sort((a, b) => {
      const r = rankOf(a) - rankOf(b)
      if (r !== 0) return r
      const v = (isVanilla(a.formId) ? 0 : 1) - (isVanilla(b.formId) ? 0 : 1)
      if (v !== 0) return v
      return a.formId.localeCompare(b.formId)
    })

    const roots = sorted.slice(0, rootCount)
    const nodesById: Record<string, SpellNode> = {}
    for (const s of sorted) {
      nodesById[s.formId] = {
        ...s,
        children: [],
        prerequisites: [],
        hardPrereqs: [],
        softPrereqs: [],
        softNeeded: 0,
        isRoot: roots.some(r => r.formId === s.formId),
        schoolColor: s.schoolColor || schoolColor(schoolName),
      }
    }

    const placed: SpellNode[] = [...roots]
    const unplaced = sorted.filter(s => !roots.some(r => r.formId === s.formId))

    for (const u of unplaced) {
      const node = nodesById[u.formId]
      const uRank = rankOf(u)
      const eligible = placed.filter(
        p => {
          const pRank = rankOf(p)
          const tierOk = pRank >= uRank - tierGap && pRank <= uRank
          return tierOk && nodesById[p.formId].children.length < maxChildren
        }
      )
      const parent = (() => {
        const themeMatches = eligible.filter(p => classifySpellByName(p.name) === classifySpellByName(u.name))
        if (themeMatching && themeMatches.length > 0) {
          return rng ? themeMatches[Math.floor(rng() * themeMatches.length)] : themeMatches[themeMatches.length - 1]
        }
        if (eligible.length > 0) {
          return rng ? eligible[Math.floor(rng() * eligible.length)] : eligible[eligible.length - 1]
        }
        const fallback = placed.slice().reverse().find(p => nodesById[p.formId].children.length < maxChildren && (rankOf(p) >= uRank - tierGap && rankOf(p) <= uRank))
        if (fallback) return fallback
        return roots[0]
      })()

      const pNode = nodesById[parent.formId]
      pNode.children.push(u.formId)
      node.prerequisites.push(parent.formId)
      node.softPrereqs.push(parent.formId)
      node.softNeeded = node.softPrereqs.length
      placed.push(u)
    }

    layoutRadial(nodesById, roots.map(r => r.formId), sectorOf[schoolName].a0, sectorOf[schoolName].a1)

    const { a0, a1 } = sectorOf[schoolName]
    const deg = (rad: number) => (rad * 180) / Math.PI
    schoolsOut[schoolName] = {
      roots: roots.map(r => r.formId),
      layoutStyle: 'tier_first',
      nodes: Object.values(nodesById),
      spokeAngle: deg(a1 - a0) / Math.max(1, roots.length),
      startAngle: deg(a0),
      endAngle: deg(a1),
      rootDirection: deg((a0 + a1) / 2),
    }
  }

  return {
    ...data,
    schools: schoolsOut,
    generatedAt: new Date().toISOString(),
    seed: seed ?? Date.now(),
  }
}
