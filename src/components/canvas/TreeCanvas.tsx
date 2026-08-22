
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'
import { Lock, Move } from 'lucide-react'

interface TreeCanvasProps {
  schoolName: string;
  allSchools: Record<string, SpellSchool>;
  selectedNodeIds: string[];
  highlightedNodeIds: string[];
  onSelectNodes: (nodeIds: string[]) => void;
  onClearHighlight: () => void;
  onNodesMove: (updates: Record<string, Partial<SpellNode>>) => void;
  onLinkNodes: (sourceId: string, targetId: string) => void;
  searchQuery?: string;
  showRadialGuides?: boolean;
}

export function TreeCanvas({ 
  schoolName, 
  allSchools, 
  selectedNodeIds, 
  highlightedNodeIds,
  onSelectNodes, 
  onClearHighlight,
  onNodesMove,
  onLinkNodes,
  searchQuery = '',
  showRadialGuides = false
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | 'linking' | 'selection' | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragNodeId = useRef<string | null>(null);
  const dragNodesInitialPos = useRef<Record<string, { x: number, y: number }>>({});
  const didDragCanvas = useRef(false);
  const originalTierBounds = useRef<Record<number, { min: number; max: number }>>({});
  const prevNodeCountRef = useRef(0);
  
  const [selectionRect, setSelectionRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [draggingNodesPos, setDraggingNodesPos] = useState<Record<string, { x: number, y: number }>>({});
  const pendingDragPos = useRef<Record<string, { x: number, y: number }>>({});
  const rafId = useRef<number | null>(null);
  const [dragFrame, setDragFrame] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || !containerRef.current) return
    const el = containerRef.current
    requestAnimationFrame(() => {
      el.style.transform = el.style.transform
      void el.offsetHeight
    })
  }, [isMounted]);

  const pendingWheelTransform = useRef<{ x: number, y: number, scale: number } | null>(null);
  const wheelRafId = useRef<number | null>(null);

  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const describeArc = (r: number, a1: number, a2: number, wraps: boolean): string => {
    const rad1 = (a1 * Math.PI) / 180;
    const rad2 = (a2 * Math.PI) / 180;
    const x1 = r * Math.cos(rad1);
    const y1 = r * Math.sin(rad1);
    const x2 = r * Math.cos(rad2);
    const y2 = r * Math.sin(rad2);
    if (wraps) {
      const mid = (a1 + a2 + 360) / 2;
      const radMid = (mid * Math.PI) / 180;
      const xm = r * Math.cos(radMid);
      const ym = r * Math.sin(radMid);
      const largeArc = (a2 - a1 + 360) > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${xm} ${ym} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    }
    const diff = a2 - a1;
    const largeArc = diff > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const clampToSchoolSector = (x: number, y: number, nodeId: string): { x: number, y: number } => {
    let nodeSchool: SpellSchool | undefined;
    if (allSchools) {
      for (const sName in allSchools) {
        if (allSchools[sName].nodes.some(n => n.formId === nodeId)) {
          nodeSchool = allSchools[sName];
          break;
        }
      }
    }
    if (!nodeSchool) return { x, y };

    const r = Math.sqrt(x * x + y * y);
    if (r < 1) return { x, y };

    const node = nodeSchool.nodes.find(n => n.formId === nodeId);
    const nodeRadius = node?.isRoot ? 15 : 9;
    const coreOuterRadius = 45;
    const coreGap = 2;
    const minRadius = coreOuterRadius + nodeRadius + coreGap;
    const dividerGap = 8;

    let resultX = x;
    let resultY = y;

    if (r < minRadius) {
      const scale = minRadius / r;
      resultX = Math.round(resultX * scale);
      resultY = Math.round(resultY * scale);
    }

    const currentR = Math.max(r, minRadius);
    const angularMargin = ((dividerGap + nodeRadius) / currentR) * (180 / Math.PI);
    const startAngle = ((nodeSchool.startAngle + angularMargin) % 360 + 360) % 360;
    const endAngle = ((nodeSchool.endAngle - angularMargin) % 360 + 360) % 360;

    let deg = (Math.atan2(resultY, resultX) * 180 / Math.PI);
    if (deg < 0) deg += 360;

    const isWrapping = startAngle > endAngle;
    const isInsideAngle = isWrapping
      ? (deg >= startAngle || deg <= endAngle)
      : (deg >= startAngle && deg <= endAngle);

    if (!isInsideAngle) {
      const toStart = Math.abs(deg - startAngle) > 180 ? 360 - Math.abs(deg - startAngle) : Math.abs(deg - startAngle);
      const toEnd = Math.abs(deg - endAngle) > 180 ? 360 - Math.abs(deg - endAngle) : Math.abs(deg - endAngle);
      const clampAngle = toStart < toEnd ? startAngle : endAngle;
      const rad = clampAngle * Math.PI / 180;
      resultX = Math.round(currentR * Math.cos(rad));
      resultY = Math.round(currentR * Math.sin(rad));
    }

    const finalR = Math.max(Math.sqrt(resultX * resultX + resultY * resultY), minRadius);
    const bounds = originalTierBounds.current;
    const nodeTier = node?.tier;
    if (nodeTier && bounds[nodeTier]) {
      const lower = bounds[nodeTier].min - 16;
      const upper = bounds[nodeTier].max + 16;
      if (finalR < lower) {
        const scale = lower / finalR;
        resultX = Math.round(resultX * scale);
        resultY = Math.round(resultY * scale);
      } else if (finalR > upper) {
        const scale = upper / finalR;
        resultX = Math.round(resultX * scale);
        resultY = Math.round(resultY * scale);
      }
    }

    return { x: resultX, y: resultY };
  };

  const lastCenteredId = useRef<string | null>(null);
  const currentSchoolName = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      if (wheelRafId.current !== null) {
        cancelAnimationFrame(wheelRafId.current);
      }
    };
  }, []);

  const school = allSchools[schoolName];

  useEffect(() => {
    if (!school || !school.nodes || school.nodes.length === 0) return;

    const nodeCount = school.nodes.length;
    if (nodeCount !== prevNodeCountRef.current) {
      prevNodeCountRef.current = nodeCount;

      const bounds: Record<number, { min: number; max: number }> = {};
      school.nodes.forEach(n => {
        const r = Math.sqrt(n.x * n.x + n.y * n.y);
        if (!bounds[n.tier]) bounds[n.tier] = { min: Infinity, max: -Infinity };
        bounds[n.tier] = { min: Math.min(bounds[n.tier].min, r), max: Math.max(bounds[n.tier].max, r) };
      });
      originalTierBounds.current = bounds;
    }

    if (schoolName !== currentSchoolName.current) {
      const firstRootId = school.roots?.[0];
      const rootNode = school.nodes.find(n => n.formId === firstRootId) || school.nodes[0];
      if (rootNode && containerRef.current) {
        setTransform({
          x: -rootNode.x * 0.5 + containerRef.current.clientWidth / 2,
          y: -rootNode.y * 0.5 + containerRef.current.clientHeight / 2,
          scale: 0.5
        });
        lastCenteredId.current = firstRootId || rootNode.formId;
      }
      currentSchoolName.current = schoolName;
    }
  }, [schoolName, school, school?.nodes]);

  useEffect(() => {
    const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
    if (
      selectedNodeId && 
      selectedNodeId !== lastCenteredId.current && 
      school && 
      containerRef.current && 
      dragMode === null
    ) {
      const node = school.nodes.find(n => n.formId === selectedNodeId);
      if (node) {
        const { clientWidth, clientHeight } = containerRef.current;
        setTransform(prev => ({
          ...prev,
          x: -node.x * prev.scale + clientWidth / 2,
          y: -node.y * prev.scale + clientHeight / 2,
        }));
        lastCenteredId.current = selectedNodeId;
      }
    }
    
    if (selectedNodeIds.length !== 1) {
      lastCenteredId.current = null;
    }
  }, [selectedNodeIds, school, dragMode]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top - transform.y) / transform.scale
    };
  };

  const updateDragPositionsDOM = () => {
    const pos = pendingDragPos.current;
    const draggedIds = Object.keys(pos);
    if (draggedIds.length === 0 || !svgRef.current) return;

    draggedIds.forEach(id => {
      const el = document.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
      if (el) {
        const x = pos[id].x;
        const y = pos[id].y;
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
    });

    const svg = svgRef.current;
    draggedIds.forEach(id => {
      const outgoing = svg.querySelectorAll(`[data-source="${id}"]`);
      outgoing.forEach(group => {
        const targetId = group.getAttribute('data-target');
        if (!targetId) return;
        let parentNode: SpellNode | undefined;
        let childNode: SpellNode | undefined;
        for (const sName in allSchools) {
          parentNode = allSchools[sName].nodes.find(n => n.formId === id);
          childNode = allSchools[sName].nodes.find(n => n.formId === targetId);
          if (parentNode && childNode) break;
        }
        if (!parentNode || !childNode) return;

        const sX = pos[id]?.x ?? parentNode.x;
        const sY = pos[id]?.y ?? parentNode.y;
        const tX = pos[targetId]?.x ?? childNode.x;
        const tY = pos[targetId]?.y ?? childNode.y;

        const dx = tX - sX;
        const dy = tY - sY;
        const angle = Math.atan2(dy, dx);
        const otherSchool = Object.values(allSchools).find(s => s.nodes.some(n => n.formId === targetId));
        const isTargetRoot = otherSchool?.roots?.includes(targetId);
        const targetRadius = (isTargetRoot ? 15 : 9) + 4;
        const x2 = tX - targetRadius * Math.cos(angle);
        const y2 = tY - targetRadius * Math.sin(angle);

        const lines = group.querySelectorAll('line');
        if (lines[0]) { lines[0].setAttribute('x1', String(sX)); lines[0].setAttribute('y1', String(sY)); lines[0].setAttribute('x2', String(x2)); lines[0].setAttribute('y2', String(y2)); }
        if (lines[1]) { lines[1].setAttribute('x1', String(sX)); lines[1].setAttribute('y1', String(sY)); lines[1].setAttribute('x2', String(x2)); lines[1].setAttribute('y2', String(y2)); }
      });

      const incoming = svg.querySelectorAll(`[data-target="${id}"]`);
      incoming.forEach(group => {
        const sourceId = group.getAttribute('data-source');
        if (!sourceId) return;
        let parentNode: SpellNode | undefined;
        let childNode: SpellNode | undefined;
        for (const sName in allSchools) {
          parentNode = allSchools[sName].nodes.find(n => n.formId === sourceId);
          childNode = allSchools[sName].nodes.find(n => n.formId === id);
          if (parentNode && childNode) break;
        }
        if (!parentNode || !childNode) return;

        const sX = pos[sourceId]?.x ?? parentNode.x;
        const sY = pos[sourceId]?.y ?? parentNode.y;
        const tX = pos[id]?.x ?? childNode.x;
        const tY = pos[id]?.y ?? childNode.y;

        const dx = tX - sX;
        const dy = tY - sY;
        const angle = Math.atan2(dy, dx);
        const otherSchool = Object.values(allSchools).find(s => s.nodes.some(n => n.formId === id));
        const isTargetRoot = otherSchool?.roots?.includes(id);
        const targetRadius = (isTargetRoot ? 15 : 9) + 4;
        const x2 = tX - targetRadius * Math.cos(angle);
        const y2 = tY - targetRadius * Math.sin(angle);

        const lines = group.querySelectorAll('line');
        if (lines[0]) { lines[0].setAttribute('x1', String(sX)); lines[0].setAttribute('y1', String(sY)); lines[0].setAttribute('x2', String(x2)); lines[0].setAttribute('y2', String(y2)); }
        if (lines[1]) { lines[1].setAttribute('x1', String(sX)); lines[1].setAttribute('y1', String(sY)); lines[1].setAttribute('x2', String(x2)); lines[1].setAttribute('y2', String(y2)); }
      });
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNode = target.closest('.spell-node');
    const nodeId = isNode?.getAttribute('data-node-id');

    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);

    if (e.button === 1) {
      setDragMode('canvas');
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      return;
    }

    if (e.shiftKey && nodeId) {
      setDragMode('linking');
      setLinkingSourceId(nodeId);
      setMousePos(canvasCoords);
      return;
    }

    if (nodeId) {
      const isAlreadySelected = selectedNodeIds.includes(nodeId);
      let newSelection = isAlreadySelected ? selectedNodeIds : [nodeId];
      
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        if (isAlreadySelected) {
          newSelection = selectedNodeIds.filter(id => id !== nodeId);
        } else {
          newSelection = [...selectedNodeIds, nodeId];
        }
      }
      
      onSelectNodes(newSelection);
      onClearHighlight();

      const node = school.nodes.find(n => n.formId === nodeId);
      if (node && !node.isLocked) {
        setDragMode('node');
        dragNodeId.current = nodeId;
        
        const nodesToMove = newSelection.includes(nodeId) ? newSelection : [nodeId];
        const initialPositions: Record<string, { x: number, y: number }> = {};
        nodesToMove.forEach(id => {
          const n = school.nodes.find(node => node.formId === id);
          if (n && !n.isLocked) {
            initialPositions[id] = { x: n.x, y: n.y };
          }
        });
        
        dragNodesInitialPos.current = initialPositions;
        dragStart.current = { x: e.clientX, y: e.clientY };
        setDraggingNodesPos(initialPositions);
      }
      return;
    }

    if (e.shiftKey) {
      setDragMode('selection');
      setSelectionRect({ x1: canvasCoords.x, y1: canvasCoords.y, x2: canvasCoords.x, y2: canvasCoords.y });
    } else if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDragMode('canvas');
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    } else {
      didDragCanvas.current = false;
      setDragMode('canvas');
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragMode) return;

    if (dragMode === 'canvas') {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDragCanvas.current = true;
      }
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
    } else if (dragMode === 'node' && dragNodeId.current) {
      const dx = (e.clientX - dragStart.current.x) / transform.scale;
      const dy = (e.clientY - dragStart.current.y) / transform.scale;

      const updates: Record<string, { x: number, y: number }> = {};

      Object.entries(dragNodesInitialPos.current).forEach(([id, initial]) => {
        const x = Math.round(initial.x + dx);
        const y = Math.round(initial.y + dy);
        const clamped = clampToSchoolSector(x, y, id);
        updates[id] = { x: clamped.x, y: clamped.y };
      });

      pendingDragPos.current = updates;
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          updateDragPositionsDOM();
          setDragFrame(f => f + 1);
          rafId.current = null;
        });
      }
    } else if (dragMode === 'linking') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);
    } else if (dragMode === 'selection' && selectionRect) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setSelectionRect(prev => prev ? { ...prev, x2: coords.x, y2: coords.y } : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    
    const finalPos = dragFrame > 0 ? pendingDragPos.current : draggingNodesPos;
    
    if (dragMode === 'node' && Object.keys(finalPos).length > 0) {
      onNodesMove(finalPos);
    }

    if (dragMode === 'linking' && linkingSourceId) {
      const target = e.target as HTMLElement;
      const targetNodeElement = target.closest('.spell-node');
      const targetId = targetNodeElement?.getAttribute('data-node-id');

      if (targetId && targetId !== linkingSourceId) {
        onLinkNodes(linkingSourceId, targetId);
      }
    }

    if (dragMode === 'selection' && selectionRect) {
      const xMin = Math.min(selectionRect.x1, selectionRect.x2);
      const xMax = Math.max(selectionRect.x1, selectionRect.x2);
      const yMin = Math.min(selectionRect.y1, selectionRect.y2);
      const yMax = Math.max(selectionRect.y1, selectionRect.y2);

      const inRect = school.nodes
        .filter(n => n.x >= xMin && n.x <= xMax && n.y >= yMin && n.y <= yMax)
        .map(n => n.formId);
      
      onSelectNodes(inRect);
      onClearHighlight();
    }

    if (dragMode === 'canvas' && !didDragCanvas.current) {
      onSelectNodes([]);
      onClearHighlight();
    }
    
    setDragMode(null);
    didDragCanvas.current = false;
    dragNodeId.current = null;
    setLinkingSourceId(null);
    dragNodesInitialPos.current = {};
    setDraggingNodesPos({ ...pendingDragPos.current });
    pendingDragPos.current = {};
    setDragFrame(0);
    setSelectionRect(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = (mouseX - transform.x) / transform.scale;
    const dy = (mouseY - transform.y) / transform.scale;
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.05), 5);

    pendingWheelTransform.current = {
      x: mouseX - dx * newScale,
      y: mouseY - dy * newScale,
      scale: newScale
    };

    if (wheelRafId.current === null) {
      wheelRafId.current = requestAnimationFrame(() => {
        if (pendingWheelTransform.current) {
          setTransform(pendingWheelTransform.current);
          pendingWheelTransform.current = null;
        }
        wheelRafId.current = null;
      });
    }
  };

  const staticRenderData = useMemo(() => {
    if (!school) return { radialGuides: [], hubLines: [], dividers: [], ghostNodes: [], schoolLabels: [], tierLabels: [] };
    const radialGuides: React.ReactNode[] = [];
    const hubLines: React.ReactNode[] = [];
    const dividers: React.ReactNode[] = [];
    const ghostNodes: React.ReactNode[] = [];
    const schoolLabels: React.ReactNode[] = [];
    const tierLabels: React.ReactNode[] = [];

    const schoolRoots = school.roots || [];
    
    if (showRadialGuides) {
      const bounds: Record<number, { min: number; max: number }> = (() => {
        const b: Record<number, { min: number; max: number }> = {};
        school.nodes.forEach(n => {
          const r = Math.sqrt(n.x * n.x + n.y * n.y);
          if (!b[n.tier]) b[n.tier] = { min: Infinity, max: -Infinity };
          b[n.tier] = { min: Math.min(b[n.tier].min, r), max: Math.max(b[n.tier].max, r) };
        });
        return b;
      })();
      if (!school) return { radialGuides: [], hubLines: [], dividers: [], ghostNodes: [], schoolLabels: [], tierLabels: [] };
      
      const sortedTiers = Object.keys(bounds).map(Number).sort((a, b) => a - b);
      const a0 = school.startAngle;
      const a1 = school.endAngle;
      const wraps = a1 <= a0;

      sortedTiers.forEach((tier, tierIndex) => {
        const { min: tierMin, max: tierMax } = bounds[tier];
        const innerR = tierMin - 16;
        const outerR = tierMax + 16;

        [innerR, outerR].forEach((r, i) => {
          const arcPath = describeArc(r, a0, a1, wraps);

          radialGuides.push(
            <path
              key={`radial-${schoolName}-${tier}-${i}`}
              d={arcPath}
              fill="none"
              stroke="hsl(var(--accent) / 0.4)"
              strokeWidth="1.5"
              strokeDasharray="5,5"
            />
          );
        });

        const nextTier = sortedTiers[tierIndex + 1];
        const nextTierInnerGuide = nextTier && bounds[nextTier] ? bounds[nextTier].min - 16 : Infinity;
        const labelR = Math.min(outerR + 12, nextTierInnerGuide - 12);

        const midAngleDeg = wraps
          ? ((a0 + a1 + 360) / 2) % 360
          : (a0 + a1) / 2;
        const midAngleRad = (midAngleDeg * Math.PI) / 180;
        const x = labelR * Math.cos(midAngleRad);
        const y = labelR * Math.sin(midAngleRad);
        const rotation = (midAngleRad * 180 / Math.PI) + 90;

        const tierNode = school.nodes.find(n => n.tier === tier);
        const tierName = tierNode?.skillLevel || `Tier ${tier}`;

        tierLabels.push(
          <text
            key={`tier-label-${schoolName}-${tier}`}
            x={x}
            y={y}
            transform={`rotate(${rotation}, ${x}, ${y})`}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground/70 font-bold pointer-events-none select-none"
            style={{ fontSize: '10px' }}
          >
            {tierName}
          </text>
        );
      });
    }

    schoolRoots.forEach(rootId => {
      const rootNode = school.nodes.find(n => n.formId === rootId);
      if (rootNode) {
        hubLines.push(
          <line
            key={`hub-${rootId}`}
            x1={0} y1={0}
            x2={rootNode.x} y2={rootNode.y}
            stroke="hsl(var(--accent))"
            strokeWidth="4" strokeOpacity="0.15" strokeDasharray="12,12" className="animate-pulse"
          />
        );
      }
    });

    Object.entries(allSchools).forEach(([name, s]) => {
      if (name === schoolName) return;
      s.nodes.forEach(n => {
        const isRoot = (s.roots || []).includes(n.formId);
        ghostNodes.push(
          <div
            key={`ghost-${n.formId}`}
            className={cn(
              "absolute flex items-center justify-center rounded-full border border-border bg-card/20 pointer-events-none opacity-20",
              isRoot && "border-accent/30"
            )}
            style={{ 
              left: n.x, 
              top: n.y, 
              transform: 'translate(-50%, -50%)',
              width: isRoot ? 30 : 18,
              height: isRoot ? 30 : 18,
            }}
          >
            <span className={cn(
              "text-center font-bold truncate leading-tight px-0.5",
              isRoot ? "text-[8px]" : "text-[7px]"
            )}>
              {n.name}
            </span>
          </div>
        );
      });
    });

    const boundaryAngles = new Set<number>()
    Object.values(allSchools).forEach((s) => {
      boundaryAngles.add(s.startAngle)
    })
    const sortedAngles = Array.from(boundaryAngles).sort((a, b) => a - b)

    const schoolMaxRadius: Record<string, number> = {}
    Object.entries(allSchools).forEach(([name, s]) => {
      if (s.nodes.length === 0) {
        schoolMaxRadius[name] = 0
        return
      }
      let maxR = 0
      s.nodes.forEach(n => {
        const r = Math.sqrt(n.x * n.x + n.y * n.y)
        if (r > maxR) maxR = r
      })
      schoolMaxRadius[name] = maxR
    })

    const globalMaxR = Math.max(...Object.values(schoolMaxRadius), 0)
    const labelR = globalMaxR + 120

    const sortedSchools = Object.entries(allSchools)
      .map(([name, school]) => ({ name, school }))
      .sort((a, b) => a.school.startAngle - b.school.startAngle)

    sortedAngles.forEach((deg, i) => {
      const current = sortedSchools[i]
      const prev = i > 0 ? sortedSchools[i - 1] : sortedSchools[sortedSchools.length - 1]
      const maxR = Math.max(schoolMaxRadius[current.name] || 0, schoolMaxRadius[prev.name] || 0) + 16
      const coreEdge = 45
      const rad = (deg * Math.PI) / 180
      const x1 = coreEdge * Math.cos(rad)
      const y1 = coreEdge * Math.sin(rad)
      const x2 = maxR * Math.cos(rad)
      const y2 = maxR * Math.sin(rad)
      dividers.push(
        <g key={`divider-${deg}`}>
          <line
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="white"
            strokeWidth="12"
            strokeOpacity="0.2"
            pointerEvents="none"
            filter="url(#divider-blur)"
          />
          <line
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="white"
            strokeWidth="6"
            strokeOpacity="0.4"
            pointerEvents="none"
            filter="url(#divider-glow)"
          />
          <line
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="white"
            strokeWidth="2"
            strokeOpacity="1"
            pointerEvents="none"
          />
        </g>
      )
    })

    sortedSchools.forEach(({ name, school }) => {
      const maxR = schoolMaxRadius[name] || 0
      if (maxR === 0) return

      const a0 = (school.startAngle * Math.PI) / 180
      const a1 = (school.endAngle * Math.PI) / 180
      const midAngleRad = (a0 + a1) / 2

      const chars = name.split('')
      const sectorAngle = a1 - a0
      const maxSpread = Math.min(sectorAngle * 0.5, chars.length * 0.018)
      const charAngle = chars.length > 1 ? maxSpread / (chars.length - 1) : 0
      const startAngleOffset = -maxSpread / 2

      chars.forEach((char, i) => {
        const angle = midAngleRad + startAngleOffset + i * charAngle
        const x = labelR * Math.cos(angle)
        const y = labelR * Math.sin(angle)
        const rotation = (angle * 180 / Math.PI) + 90

        schoolLabels.push(
          <text
            key={`label-${name}-${i}`}
            x={x}
            y={y}
            transform={`rotate(${rotation}, ${x}, ${y})`}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground/80 font-bold pointer-events-none select-none"
            style={{ fontSize: '40px' }}
          >
            {char}
          </text>
        )
      })
    })

    return { radialGuides, hubLines, dividers, ghostNodes, schoolLabels, tierLabels };
  }, [allSchools, schoolName, school, selectedNodeIds, searchQuery, showRadialGuides]);

  const dynamicRenderData = useMemo(() => {
    if (!school) return { nodes: [], connections: [], nodeSpokes: [] };
    const nodes: React.ReactNode[] = [];
    const connections: React.ReactNode[] = [];
    const nodeSpokes: React.ReactNode[] = [];
    const currentDragPos = dragFrame > 0 ? pendingDragPos.current : draggingNodesPos;

    const schoolRoots = school.roots || [];
    const prereqNodeIds = new Set<string>();
    const childNodeIds = new Set<string>();
    
    const primarySelectedId = selectedNodeIds.length > 0 ? selectedNodeIds[0] : null;
    const selectedNodeSet = new Set(selectedNodeIds);
    const highlightedSet = new Set([...selectedNodeIds, ...(highlightedNodeIds || [])]);
    const isMultiSelect = selectedNodeIds.length > 1;
    const nodeMap = new Map(school.nodes.map(n => [n.formId, n]));

    let primarySelectedNode: SpellNode | undefined;
    if (primarySelectedId) {
      primarySelectedNode = nodeMap.get(primarySelectedId);
      if (primarySelectedNode) {
        primarySelectedNode.children?.forEach(id => childNodeIds.add(id));
        primarySelectedNode.prerequisites?.forEach(id => prereqNodeIds.add(id));
        primarySelectedNode.hardPrereqs?.forEach(id => prereqNodeIds.add(id));
        primarySelectedNode.softPrereqs?.forEach(id => prereqNodeIds.add(id));
      }
    }

    school.nodes.forEach(node => {
      const x = currentDragPos[node.formId]?.x ?? node.x;
      const y = currentDragPos[node.formId]?.y ?? node.y;

      if (node.showSpokes) {
        for (let angle = 0; angle < 360; angle += 15) {
          const rad = (angle * Math.PI) / 180;
          const length = 5000;
          const x2 = x + Math.cos(rad) * length;
          const y2 = y + Math.sin(rad) * length;
          nodeSpokes.push(
            <line
              key={`node-spoke-${node.formId}-${angle}`}
              x1={x} y1={y}
              x2={x2} y2={y2}
              stroke="#facc15"
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeDasharray="10,5"
              pointerEvents="none"
            />
          );
        }
      }

      (node.children || []).forEach(childId => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          const isChildPath = selectedNodeSet.has(node.formId);
          const isPrereqPath = selectedNodeSet.has(childId);
          const isHighlighted = isChildPath || isPrereqPath;
          const showConnection = selectedNodeSet.has(node.formId) || selectedNodeSet.has(childId);

          const sX = x;
          const sY = y;
          const tX = currentDragPos[childId]?.x ?? childNode.x;
          const tY = currentDragPos[childId]?.y ?? childNode.y;

          const dx = tX - sX;
          const dy = tY - sY;
          const angle = Math.atan2(dy, dx);
          const isTargetRoot = schoolRoots.includes(childNode.formId);
          const targetRadius = (isTargetRoot ? 15 : 9) + 4;
          const x2 = tX - targetRadius * Math.cos(angle);
          const y2 = tY - targetRadius * Math.sin(angle);

          if (!isNaN(sX) && !isNaN(sY) && !isNaN(x2) && !isNaN(y2) && showConnection) {
            connections.push(
              <g key={`link-${node.formId}-${childId}`} data-source={node.formId} data-target={childId}>
                <line
                  x1={sX} y1={sY}
                  x2={x2} y2={y2}
                  stroke={isPrereqPath ? "#22c55e" : (isChildPath ? "#f97316" : "hsl(var(--primary))")}
                  strokeWidth={isHighlighted ? "2" : "1"}
                  strokeOpacity={isHighlighted ? "0.9" : "0.12"}
                  markerEnd={isPrereqPath ? "url(#arrow-prereq)" : (isChildPath ? "url(#arrow-child)" : "url(#arrow-default)")}
                  className="pointer-events-none"
                />
              </g>
            );
          }
        }
      });

      const isMatch = searchQuery.length > 1 && (
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        node.formId.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const isRoot = schoolRoots.includes(node.formId);
      const isSelected = highlightedSet.has(node.formId);
      const isPrereq = prereqNodeIds.has(node.formId);
      const isChild = childNodeIds.has(node.formId);
      
      const nodeBorderColor = isSelected ? 'hsl(var(--accent))' :
        isPrereq ? '#22c55e' :
        isChild ? '#f97316' :
        isMatch ? '#facc15' :
        node.schoolColor || '#94a3b8';

      nodes.push(
        <div
          key={node.formId}
          data-node-id={node.formId}
          className={cn(
            "spell-node absolute flex items-center justify-center rounded-full border bg-card cursor-grab pointer-events-auto arcane-glow select-none group transition-all",
            (dragMode === 'node' || dragFrame > 0) && "transition-none",
            node.isLocked && "cursor-default",
            isSelected ? "node-selected ring-2 ring-accent ring-offset-1 ring-offset-background z-30 scale-110" : undefined,
            isPrereq && !isSelected && "ring-2 ring-[#22c55e]/50 z-20 scale-105",
            isChild && !isSelected && "ring-2 ring-[#f97316]/50 z-20 scale-105",
            isRoot && "shadow-[0_0_15px_hsl(var(--accent))] z-10",
            linkingSourceId === node.formId && "ring-2 ring-accent ring-offset-2 animate-pulse z-40",
            currentDragPos[node.formId] && "cursor-grabbing scale-110 opacity-80 z-50",
            isMatch && "node-pulse ring-2 ring-yellow-400 z-50 scale-125 shadow-[0_0_20px_hsl(48_100%_50%)]"
          )}
          style={{ 
            left: 0, 
            top: 0, 
            transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
            transition: dragMode === 'node' || dragFrame > 0 || !isMounted ? 'none' : 'transform 0.35s ease-out',
            width: isRoot ? 30 : 18,
            height: isRoot ? 30 : 18,
            borderColor: nodeBorderColor,
          }}
        >
          <span className={cn(
            "text-center font-bold truncate leading-tight px-0.5 pointer-events-none group-hover:whitespace-normal group-hover:bg-card/95 group-hover:absolute group-hover:z-50 group-hover:p-1 group-hover:rounded group-hover:border group-hover:border-border transition-all",
            isRoot ? "text-[8px]" : "text-[7px]"
          )}>
            {node.name}
          </span>
          <div 
            className={cn(
              "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background shadow-sm",
              node.skillLevel === 'Master' ? "bg-yellow-500" :
              node.skillLevel === 'Expert' ? "bg-purple-500" :
              node.skillLevel === 'Adept' ? "bg-blue-500" :
              node.skillLevel === 'Apprentice' ? "bg-green-500" : "bg-gray-500"
            )} 
          />
          {node.isLocked && (
            <Lock className="w-2.5 h-2.5 text-accent absolute -bottom-1 -left-1 bg-card rounded-full p-0.5 border border-accent/40 shadow-sm z-50" />
          )}
        </div>
      );
    });

    return { nodes, connections, nodeSpokes };
  }, [allSchools, schoolName, school, selectedNodeIds, dragMode, searchQuery, showRadialGuides, draggingNodesPos, onLinkNodes]);

  const activeDragInfo = useMemo(() => {
    if (dragMode !== 'node' || !dragNodeId.current) return null;
    const pos = dragFrame > 0 ? pendingDragPos.current[dragNodeId.current] : draggingNodesPos[dragNodeId.current];
    if (!pos) return null;
    let deg = (Math.atan2(pos.y, pos.x) * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;
    if (deg >= 360) deg -= 360;
    return { x: pos.x, y: pos.y, deg: Math.round(deg) };
  }, [dragMode, dragFrame, draggingNodesPos]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background cursor-crosshair",
        dragMode === 'canvas' && "cursor-grabbing",
        dragMode === 'linking' && "cursor-alias",
        dragMode === 'selection' && "cursor-cell"
      )}
      style={{ contain: 'layout style paint' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {activeDragInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-2 bg-accent/90 text-accent-foreground font-mono text-xs rounded-full shadow-2xl backdrop-blur-sm border border-white/20 animate-in fade-in slide-in-from-top-4">
          <Move className="w-3 h-3" />
          <div className="flex gap-4">
            <span className="flex gap-1.5"><span className="opacity-60">X:</span>{activeDragInfo.x}</span>
            <span className="flex gap-1.5"><span className="opacity-60">Y:</span>{activeDragInfo.y}</span>
            <span className="flex gap-1.5"><span className="opacity-60">DEG:</span>{activeDragInfo.deg}°</span>
          </div>
        </div>
      )}

      <div 
        className="absolute origin-top-left pointer-events-none"
        style={{ 
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}
      >
        <svg ref={svgRef} className="absolute overflow-visible" style={{ width: 1, height: 1 }}>
          <defs>
            <filter id="divider-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <filter id="divider-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" fillOpacity="0.4" /></marker>
            <marker id="arrow-child" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" /></marker>
            <marker id="arrow-prereq" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" /></marker>
          </defs>
          {staticRenderData.radialGuides}
          {staticRenderData.hubLines}
          {dynamicRenderData.nodeSpokes}
          {dynamicRenderData.connections}
          {dragMode === 'linking' && linkingSourceId && (
            <line
              x1={school.nodes.find(n => n.formId === linkingSourceId)?.x ?? 0}
              y1={school.nodes.find(n => n.formId === linkingSourceId)?.y ?? 0}
              x2={mousePos.x} y2={mousePos.y}
              stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse"
            />
          )}
          {staticRenderData.dividers}
          {staticRenderData.schoolLabels}
          {staticRenderData.tierLabels}
        </svg>

        <div 
          className="absolute rounded-full border-[6px] border-accent/40 bg-card flex items-center justify-center z-50 pointer-events-none shadow-[0_0_40px_hsl(var(--accent)/0.2)]"
          style={{ left: 0, top: 0, width: 90, height: 90, transform: 'translate(-50%, -50%)' }}
        >
          <div className="text-center">
            <div className="text-[7px] font-black tracking-tighter text-accent uppercase animate-pulse">Core</div>
            <div className="text-[10px] font-black text-foreground uppercase">Magic</div>
          </div>
        </div>

        {staticRenderData.ghostNodes}
        {dynamicRenderData.nodes}

        {dragMode === 'selection' && selectionRect && (
          <div 
            className="absolute border-2 border-accent/60 bg-accent/10 pointer-events-none z-50"
            style={{
              left: Math.min(selectionRect.x1, selectionRect.x2),
              top: Math.min(selectionRect.y1, selectionRect.y2),
              width: Math.abs(selectionRect.x2 - selectionRect.x1),
              height: Math.abs(selectionRect.y2 - selectionRect.y1),
            }}
          />
        )}
      </div>
    </div>
  )
}