
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'
import { Lock, Move } from 'lucide-react'

interface TreeCanvasProps {
  schoolName: string;
  school: SpellSchool;
  selectedNodeIds: string[];
  onSelectNodes: (nodeIds: string[]) => void;
  onNodesMove: (updates: Record<string, Partial<SpellNode>>) => void;
  onLinkNodes: (sourceId: string, targetId: string) => void;
  searchQuery?: string;
  showRadialGuides?: boolean;
}

export function TreeCanvas({ 
  schoolName, 
  school, 
  selectedNodeIds, 
  onSelectNodes, 
  onNodesMove,
  onLinkNodes,
  searchQuery = '',
  showRadialGuides = false
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | 'linking' | 'selection' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodesInitialPos, setDragNodesInitialPos] = useState<Record<string, { x: number, y: number }>>({});
  
  const [selectionRect, setSelectionRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [draggingNodesPos, setDraggingNodesPos] = useState<Record<string, { x: number, y: number }>>({});

  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const lastCenteredId = useRef<string | null>(null);
  const currentSchoolName = useRef<string | null>(null);

  useEffect(() => {
    if (school && schoolName !== currentSchoolName.current) {
      const firstRootId = school.roots?.[0];
      const rootNode = school.nodes.find(n => n.formId === firstRootId) || school.nodes[0];
      if (rootNode && containerRef.current) {
        setTransform({
          x: -rootNode.x * 0.5 + containerRef.current.clientWidth / 2,
          y: -rootNode.y * 0.5 + containerRef.current.clientHeight / 2,
          scale: 0.5
        });
        lastCenteredId.current = firstRootId || rootNode.formId;
        currentSchoolName.current = schoolName;
      }
    }
  }, [schoolName, school]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNode = target.closest('.spell-node');
    const nodeId = isNode?.getAttribute('data-node-id');

    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);

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

      const node = school.nodes.find(n => n.formId === nodeId);
      if (node && !node.isLocked) {
        setDragMode('node');
        setDragNodeId(nodeId);
        
        const nodesToMove = newSelection.includes(nodeId) ? newSelection : [nodeId];
        const initialPositions: Record<string, { x: number, y: number }> = {};
        nodesToMove.forEach(id => {
          const n = school.nodes.find(node => node.formId === id);
          if (n) initialPositions[id] = { x: n.x, y: n.y };
        });
        
        setDragNodesInitialPos(initialPositions);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDraggingNodesPos(initialPositions);
      }
      return;
    }

    if (e.shiftKey) {
      setDragMode('selection');
      setSelectionRect({ x1: canvasCoords.x, y1: canvasCoords.y, x2: canvasCoords.x, y2: canvasCoords.y });
    } else if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDragMode('canvas');
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    } else {
      onSelectNodes([]);
      setDragMode('canvas');
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragMode) return;

    if (dragMode === 'canvas') {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    } else if (dragMode === 'node' && dragNodeId) {
      const dx = (e.clientX - dragStart.x) / transform.scale;
      const dy = (e.clientY - dragStart.y) / transform.scale;
      
      const updates: Record<string, { x: number, y: number }> = {};
      Object.entries(dragNodesInitialPos).forEach(([id, initial]) => {
        let x = Math.round(initial.x + dx);
        let y = Math.round(initial.y + dy);

        if (e.ctrlKey || e.metaKey) {
          if (showRadialGuides) {
            const r = Math.sqrt(x * x + y * y);
            const rSnap = Math.round(r / 25) * 25;
            const theta = Math.atan2(y, x);
            x = Math.round(rSnap * Math.cos(theta));
            y = Math.round(rSnap * Math.sin(theta));
          } else {
            x = Math.round(x / 25) * 25;
            y = Math.round(y / 25) * 25;
          }
        }
        updates[id] = { x, y };
      });

      setDraggingNodesPos(updates);
    } else if (dragMode === 'linking') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);
    } else if (dragMode === 'selection' && selectionRect) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setSelectionRect(prev => prev ? { ...prev, x2: coords.x, y2: coords.y } : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragMode === 'node' && Object.keys(draggingNodesPos).length > 0) {
      onNodesMove(draggingNodesPos);
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
    }
    
    setDragMode(null);
    setDragNodeId(null);
    setLinkingSourceId(null);
    setDraggingNodesPos({});
    setSelectionRect(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.05), 5);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = (mouseX - transform.x) / transform.scale;
    const dy = (mouseY - transform.y) / transform.scale;

    setTransform({
      scale: newScale,
      x: mouseX - dx * newScale,
      y: mouseY - dy * newScale
    });
  };

  const renderData = useMemo(() => {
    if (!school) return { nodes: [], connections: [], hubLines: [], radialGuides: [], spokes: [] };
    const nodes: React.ReactNode[] = [];
    const connections: React.ReactNode[] = [];
    const hubLines: React.ReactNode[] = [];
    const radialGuides: React.ReactNode[] = [];
    const spokes: React.ReactNode[] = [];

    const schoolRoots = school.roots || [];
    const prereqNodeIds = new Set<string>();
    const childNodeIds = new Set<string>();
    
    const primarySelectedId = selectedNodeIds.length > 0 ? selectedNodeIds[0] : null;

    if (primarySelectedId) {
      const selectedNode = school.nodes.find(n => n.formId === primarySelectedId);
      if (selectedNode) {
        selectedNode.children?.forEach(id => childNodeIds.add(id));
        selectedNode.prerequisites?.forEach(id => prereqNodeIds.add(id));
        selectedNode.hardPrereqs?.forEach(id => prereqNodeIds.add(id));
        selectedNode.softPrereqs?.forEach(id => prereqNodeIds.add(id));
      }
    }

    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const length = 5000;
      const x2 = Math.cos(rad) * length;
      const y2 = Math.sin(rad) * length;
      const isMajor = angle % 90 === 0;
      const isSemiMajor = angle % 45 === 0;

      spokes.push(
        <line
          key={`spoke-${angle}`}
          x1={0} y1={0}
          x2={x2} y2={y2}
          stroke={isMajor ? "rgba(255, 60, 60, 0.5)" : isSemiMajor ? "rgba(255, 60, 60, 0.3)" : "rgba(255, 60, 60, 0.15)"}
          strokeWidth={isMajor ? "1.5" : "1"}
          strokeDasharray={isMajor ? "" : "8,8"}
          pointerEvents="none"
        />
      );
    }

    if (showRadialGuides) {
      for (let r = 25; r <= 4000; r += 25) {
        const isMajor = r % 100 === 0;
        radialGuides.push(
          <circle
            key={`radial-${r}`}
            cx={0} cy={0}
            r={r}
            fill="none"
            stroke={isMajor ? "hsl(var(--accent) / 0.3)" : "hsl(var(--accent) / 0.1)"}
            strokeWidth={isMajor ? "1.5" : "0.5"}
            strokeDasharray={isMajor ? "8,8" : "4,4"}
          />
        );
      }
    }

    schoolRoots.forEach(rootId => {
      const rootNode = school.nodes.find(n => n.formId === rootId);
      if (rootNode) {
        const rootX = draggingNodesPos[rootId]?.x ?? rootNode.x;
        const rootY = draggingNodesPos[rootId]?.y ?? rootNode.y;

        hubLines.push(
          <line
            key={`hub-${rootId}`}
            x1={0} y1={0}
            x2={rootX} y2={rootY}
            stroke="hsl(var(--accent))"
            strokeWidth="4" strokeOpacity="0.15" strokeDasharray="12,12" className="animate-pulse"
          />
        );
      }
    });

    school.nodes.forEach(node => {
      (node.children || []).forEach(childId => {
        const childNode = school.nodes.find(n => n.formId === childId);
        if (childNode) {
          const isChildPath = selectedNodeIds.includes(node.formId);
          const isPrereqPath = selectedNodeIds.includes(childId);
          const isHighlighted = isChildPath || isPrereqPath;

          const sX = draggingNodesPos[node.formId]?.x ?? node.x;
          const sY = draggingNodesPos[node.formId]?.y ?? node.y;
          const tX = draggingNodesPos[childId]?.x ?? childNode.x;
          const tY = draggingNodesPos[childId]?.y ?? childNode.y;

          const dx = tX - sX;
          const dy = tY - sY;
          const angle = Math.atan2(dy, dx);
          const isRoot = schoolRoots.includes(childNode.formId);
          // Roots are 30px (15px radius), Spells are 18px (9px radius)
          const targetRadius = (isRoot ? 15 : 9) + 4;
          const x2 = tX - targetRadius * Math.cos(angle);
          const y2 = tY - targetRadius * Math.sin(angle);

          connections.push(
            <line
              key={`${node.formId}-${childId}`}
              x1={sX} y1={sY}
              x2={x2} y2={y2}
              stroke={isPrereqPath ? "#22c55e" : (isChildPath ? "#f97316" : "hsl(var(--primary))")}
              strokeWidth={isHighlighted ? "2" : "1"}
              strokeOpacity={isHighlighted ? "0.9" : "0.4"}
              markerEnd={isPrereqPath ? "url(#arrow-prereq)" : (isChildPath ? "url(#arrow-child)" : "url(#arrow-default)")}
            />
          );
        }
      });

      const isMatch = searchQuery.length > 1 && (
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        node.formId.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const isRoot = schoolRoots.includes(node.formId);
      const isSelected = selectedNodeIds.includes(node.formId);
      const isPrereq = prereqNodeIds.has(node.formId);
      const isChild = childNodeIds.has(node.formId);
      
      const x = draggingNodesPos[node.formId]?.x ?? node.x;
      const y = draggingNodesPos[node.formId]?.y ?? node.y;

      nodes.push(
        <div
          key={node.formId}
          data-node-id={node.formId}
          className={cn(
            "spell-node absolute flex items-center justify-center rounded-full border bg-card cursor-grab pointer-events-auto arcane-glow select-none group transition-all",
            (dragMode === 'node' || Object.keys(draggingNodesPos).length > 0) && "transition-none",
            node.isLocked && "cursor-default",
            isSelected ? "node-selected ring-2 ring-accent ring-offset-1 ring-offset-background z-30 scale-110" : "border-primary/40",
            isPrereq && !isSelected && "border-[#22c55e] ring-2 ring-[#22c55e]/50 z-20 scale-105",
            isChild && !isSelected && "border-[#f97316] ring-2 ring-[#f97316]/50 z-20 scale-105",
            isRoot && "border-accent shadow-[0_0_15px_hsl(var(--accent))] z-10",
            linkingSourceId === node.formId && "ring-2 ring-accent ring-offset-2 animate-pulse z-40",
            draggingNodesPos[node.formId] && "cursor-grabbing scale-110 opacity-80 z-50",
            isMatch && "node-pulse ring-2 ring-yellow-400 border-yellow-400 z-50 scale-125 shadow-[0_0_20px_hsl(48_100%_50%)]"
          )}
          style={{ 
            left: x, 
            top: y, 
            transform: 'translate(-50%, -50%)',
            width: isRoot ? 30 : 18,
            height: isRoot ? 30 : 18,
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
        </div>
      );
    });

    return { nodes, connections, hubLines, radialGuides, spokes };
  }, [school, selectedNodeIds, dragMode, searchQuery, showRadialGuides, draggingNodesPos]);

  const activeDragInfo = useMemo(() => {
    if (dragMode !== 'node' || !dragNodeId || !draggingNodesPos[dragNodeId]) return null;
    const { x, y } = draggingNodesPos[dragNodeId];
    // Coordinate HUD logic: 360 is UP
    let deg = (Math.atan2(y, x) * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;
    if (deg >= 360) deg -= 360;
    return { x, y, deg: Math.round(deg) };
  }, [dragMode, dragNodeId, draggingNodesPos]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background cursor-crosshair",
        dragMode === 'canvas' && "cursor-grabbing",
        dragMode === 'linking' && "cursor-alias",
        dragMode === 'selection' && "cursor-cell"
      )}
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
        className={cn(
          "absolute origin-top-left pointer-events-none",
          !dragMode && "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        {!showRadialGuides && (
          <div className="absolute inset-[-50000px] pointer-events-none arcane-grid" />
        )}

        <svg className="absolute overflow-visible" style={{ width: 1, height: 1 }}>
          <defs>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" fillOpacity="0.4" /></marker>
            <marker id="arrow-child" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" /></marker>
            <marker id="arrow-prereq" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" /></marker>
          </defs>
          {renderData.spokes}
          {renderData.radialGuides}
          {renderData.hubLines}
          {renderData.connections}
          {dragMode === 'linking' && linkingSourceId && (
            <line
              x1={school.nodes.find(n => n.formId === linkingSourceId)?.x ?? 0}
              y1={school.nodes.find(n => n.formId === linkingSourceId)?.y ?? 0}
              x2={mousePos.x} y2={mousePos.y}
              stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse"
            />
          )}
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

        {renderData.nodes}

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
