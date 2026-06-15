export interface SpellNodeLock {
  nodeId: string;
  score: number;
  revealed: boolean;
}

export interface SpellNode {
  formId: string;
  children: string[];
  prerequisites: string[];
  hardPrereqs: string[];
  softPrereqs: string[];
  softNeeded: number;
  tier: number;
  skillLevel: string;
  theme: string;
  name: string;
  x: number;
  y: number;
  locks?: SpellNodeLock[];
  isRoot?: boolean;
}

export interface SpellSchool {
  root: string;
  layoutStyle: string;
  nodes: SpellNode[];
  spokeAngle: number;
  startAngle: number;
  endAngle: number;
  rootDirection: number;
}

export interface SpellTreeConfig {
  density: number;
  shape: string;
  symmetry: number;
}

export interface SpellTreeGlobe {
  x: number;
  y: number;
  radius: number;
}

export interface SpellTreeData {
  version: string;
  generator: string;
  generatedAt: string;
  trustPrereqs: boolean;
  noRotate: boolean;
  layoutMode: string;
  config: SpellTreeConfig;
  globe: SpellTreeGlobe;
  schools: Record<string, SpellSchool>;
  seed: number;
}
