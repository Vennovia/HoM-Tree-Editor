
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'
import { Lock, Move } from 'lucide-react'

interface GlobalGrimoireViewProps {
  schools: Record<string, SpellSchool>;
  selectedNodeIds: string[];
  onSelectNodes: (nodeIds: string[]) => void;
  onNodesMove: (updates: Record<string, Partial<SpellNode>>) => void;
  onLinkNodes: (sourceId: string, targetId: string) => void;
  searchQuery?: string;
  showRadialGuides?: boolean;
  showNodeSpokes?: boolean;
  gridSize?: number;
}

export function GlobalGrimoireView({ 
  schools, 
  selectedNodeIds, 
  onSelectNodes, 
  onNodesMove,
  onLinkNodes,
  searchQuery = '',
  showRadialGuides = false,
  showNodeSpokes = false,
  gridSize = 25
}: GlobalGrimoireViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.25 });
  
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | 'linking' | 'selection' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodesInitialPos, setDragNodesInitialPos] = useState<Record<string, { x: number, y: number }>>({});
  
  const [selectionRect, setSelectionRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [draggingNodesPos, setDraggingNodesPos] = useState<Record<string, { x: number, y: number }>>({});

  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setTransform({
        x: containerRef.current.clientWidth / 2,
        y: containerRef.current.clientHeight / 2,
        scale: 0.25
      });
    }
  }, []);

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
    const nodeEl = target.closest('.spell-node');
    const nodeId = nodeEl?.getAttribute('data-node-id');

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

      let foundNode: SpellNode | undefined;
      for (const sName in schools) {
        foundNode = schools[sName].nodes.find(n => n.formId === nodeId);
        if (foundNode) break;
      }

      if (foundNode && !foundNode.isLocked) {
        setDragMode('node');
        setDragNodeId(nodeId);
        
        const nodesToMove = newSelection.includes(nodeId) ? newSelection : [nodeId];
        const initialPositions: Record<string, { x: number, y: number }> = {};
        
        nodesToMove.forEach(id => {
          for (const sName in schools) {
            const n = schools[sName].nodes.find(node => node.formId === id);
            if (n && !n.isLocked) {
              initialPositions[id] = { x: n.x, y: n.y };
              break;
            }
          }
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
    } else if (e.button === 0 || e.button === 1) {
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
          const s = Math.max(1, gridSize || 25);
          if (showRadialGuides) {
            const r = Math.sqrt(x * x + y * y);
            const rSnap = Math.round(r / s) * s;
            const theta = Math.atan2(y, x);
            x = Math.round(rSnap * Math.cos(theta));
            y = Math.round(rSnap * Math.sin(theta));
          } else {
            x = Math.round(x / s) * s;
            y = Math.round(y / s) * s;
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
      const targetNode = target.closest('.spell-node');
      const targetId = targetNode?.getAttribute('data-node-id');

      if (targetId && targetId !== linkingSourceId) {
        onLinkNodes(linkingSourceId, targetId);
      }
    }

    if (dragMode === 'selection' && selectionRect) {
      const xMin = Math.min(selectionRect.x1, selectionRect.x2);
      const xMax = Math.max(selectionRect.x1, selectionRect.x2);
      const yMin = Math.min(selectionRect.y1, selectionRect.y2);
      const yMax = Math.max(selectionRect.y1, selectionRect.y2);

      const inRect: string[] = [];
      Object.values(schools).forEach(school => {
        school.nodes.forEach(n => {
          if (n.x >= xMin && n.x <= xMax && n.y >= yMin && n.y <= yMax) {
            inRect.push(n.formId);
          }
        });
      });
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
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.05), 2);
    
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

  const renderContent = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    const connections: React.ReactNode[] = [];
    const hubLines: React.ReactNode[] = [];
    const radialGuides: React.ReactNode[] = [];
    const spokes: React.ReactNode[] = [];
    const nodeSpokes: React.ReactNode[] = [];

    const prereqNodeIds = new Set<string>();
    const childNodeIds = new Set<string>();
    
    const primarySelectedId = selectedNodeIds.length > 0 ? selectedNodeIds[0] : null;

    let primarySelectedNode: SpellNode | undefined;
    if (primarySelectedId) {
      for (const sName in schools) {
        primarySelectedNode = schools[sName].nodes.find(n => n.formId === primarySelectedId);
        if (primarySelectedNode) break;
      }
      if (primarySelectedNode) {
        primarySelectedNode.children?.forEach(id => childNodeIds.add(id));
        primarySelectedNode.prerequisites?.forEach(id => prereqNodeIds.add(id));
        primarySelectedNode.hardPrereqs?.forEach(id => prereqNodeIds.add(id));
        primarySelectedNode.softPrereqs?.forEach(id => prereqNodeIds.add(id));
      }
    }

    if (showNodeSpokes && primarySelectedNode) {
      const pX = draggingNodesPos[primarySelectedNode.formId]?.x ?? primarySelectedNode.x;
      const pY = draggingNodesPos[primarySelectedNode.formId]?.y ?? primarySelectedNode.y;
      
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        const length = 5000;
        const x2 = pX + Math.cos(rad) * length;
        const y2 = pY + Math.sin(rad) * length;
        
        nodeSpokes.push(
          <line
            key={`node-spoke-${angle}`}
            x1={pX} y1={pY}
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

    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const length = 10000;
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
      const s = Math.max(1, gridSize || 25);
      for (let r = s; r <= 5000; r += s) {
        const isMajor = r % (s * 4) === 0;
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

    Object.entries(schools).forEach(([sName, school]) => {
      const schoolRoots = school.roots || [];
      
      schoolRoots.forEach(rootId => {
        const schoolRoot = school.nodes.find(n => n.formId === rootId);
        if (schoolRoot) {
          const rootX = draggingNodesPos[rootId]?.x ?? schoolRoot.x;
          const rootY = draggingNodesPos[rootId]?.y ?? schoolRoot.y;

          hubLines.push(
            <line
              key={`hub-${sName}-${rootId}`}
              x1={0} y1={0}
              x2={rootX} y2={rootY}
              stroke="hsl(var(--accent))"
              strokeWidth="4" strokeOpacity="0.15" strokeDasharray="12,12" className="animate-pulse"
            />
          );
        }
      });

      school.nodes.forEach(node => {
        const isRoot = schoolRoots.includes(node.formId);

        (node.children || []).forEach(childId => {
          let childNode: SpellNode | undefined;
          for (const otherSchoolName in schools) {
            childNode = schools[otherSchoolName].nodes.find(n => n.formId === childId);
            if (childNode) break;
          }

          if (childNode) {
            const isChildPath = selectedNodeIds.includes(node.formId);
            const isPrereqPath = selectedNodeIds.includes(childId);
            const isHighlighted = isChildPath || isPrereqPath;
            
            const nX = draggingNodesPos[node.formId]?.x ?? node.x;
            const nY = draggingNodesPos[node.formId]?.y ?? node.y;
            const cX = draggingNodesPos[childId]?.x ?? childNode.x;
            const cY = draggingNodesPos[childId]?.y ?? childNode.y;

            const dx = cX - nX;
            const dy = cY - nY;
            const angle = Math.atan2(dy, dx);
            
            const isTargetRoot = (childNode && schools[sName].roots?.includes(childNode.formId));
            const targetRadius = (isTargetRoot ? 15 : 9) + 4;
            const x2 = cX - targetRadius * Math.cos(angle);
            const y2 = cY - targetRadius * Math.sin(angle);

            connections.push(
              <line
                key={`${sName}-${node.formId}-${childId}`}
                x1={nX} y1={nY}
                x2={x2} y2={y2}
                stroke={isPrereqPath ? "#22c55e" : (isChildPath ? "#f97316" : "hsl(var(--primary))")}
                strokeWidth={isHighlighted ? "2" : "0.75"}
                strokeOpacity={isHighlighted ? "0.8" : "0.2"}
                markerEnd={isPrereqPath ? "url(#arrow-prereq)" : (isChildPath ? "url(#arrow-child)" : "url(#arrow-default)")}
              />
            );
          }
        });

        const isSelected = selectedNodeIds.includes(node.formId);
        const isPrereq = prereqNodeIds.has(node.formId);
        const isChild = childNodeIds.has(node.formId);
        
        const isMatch = searchQuery.length > 1 && (
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.formId.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const x = draggingNodesPos[node.formId]?.x ?? node.x;
        const y = draggingNodesPos[node.formId]?.y ?? node.y;

        nodes.push(
          <div
            key={`${sName}-${node.formId}`}
            data-node-id={node.formId}
            className={cn(
              "spell-node absolute flex items-center justify-center rounded-full border bg-card/90 transition-all cursor-grab pointer-events-auto select-none group",
              (dragMode === 'node' || Object.keys(draggingNodesPos).length > 0) && "transition-none",
              isSelected ? "node-selected ring-2 ring-accent z-30 scale-110" : "border-border hover:border-accent/60",
              isPrereq && !isSelected && "border-[#22c55e] ring-2 ring-[#22c55e] z-20 scale-105",
              isChild && !isSelected && "border-[#f97316] ring-2 ring-[#f97316]/50 z-20 scale-105",
              isRoot && "border-accent bg-accent/5 z-10 shadow-[0_0_15px_hsl(var(--accent)/0.2)]",
              isMatch && "ring-4 ring-yellow-400 scale-150 z-40",
              draggingNodesPos[node.formId] && "cursor-grabbing opacity-70 scale-105",
              node.isLocked && "cursor-default"
            )}
            style={{
              left: x, top: y,
              width: isRoot ? 30 : 18, height: isRoot ? 30 : 18,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className={cn(
              "font-bold text-center px-0.5 truncate leading-tight pointer-events-none group-hover:whitespace-normal group-hover:bg-card/95 group-hover:absolute group-hover:z-50 group-hover:p-1 group-hover:rounded group-hover:border group-hover:border-border transition-all",
              isRoot ? "text-[8px]" : "text-[7px]"
            )}>
              {node.name}
            </span>
            {node.isLocked && (
              <Lock className="w-2.5 h-2.5 text-accent absolute -bottom-1 -left-1 bg-card rounded-full p-0.5 border border-accent/40 shadow-sm z-50" />
            )}
          </div>
        );
      });
    });

    return { nodes, connections, hubLines, radialGuides, spokes, nodeSpokes };
  }, [schools, selectedNodeIds, searchQuery, showRadialGuides, showNodeSpokes, draggingNodesPos, dragMode, gridSize]);

  const activeDragInfo = useMemo(() => {
    if (dragMode !== 'node' || !dragNodeId || !draggingNodesPos[dragNodeId]) return null;
    const { x, y } = draggingNodesPos[dragNodeId];
    let deg = (Math.atan2(y, x) * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;
    if (deg >= 360) deg -= 360;
    return { x, y, deg: Math.round(deg) };
  }, [dragMode, dragNodeId, draggingNodesPos]);

  let linkingSourceNode: SpellNode | undefined;
  if (linkingSourceId) {
    for (const sName in schools) {
      linkingSourceNode = schools[sName].nodes.find(n => n.formId === linkingSourceId);
      if (linkingSourceNode) break;
    }
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing",
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
          <div 
            className="absolute inset-[-50000px] pointer-events-none arcane-grid" 
            style={{ 
              backgroundSize: `${gridSize}px ${gridSize}px`,
              backgroundPosition: '50000px 50000px'
            }}
          />
        )}

        <svg className="absolute overflow-visible" style={{ width: 1, height: 1 }}>
          <defs>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" fillOpacity="0.4" /></marker>
            <marker id="arrow-child" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" /></marker>
            <marker id="arrow-prereq" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" /></marker>
          </defs>
          {renderContent.spokes}
          {renderContent.radialGuides}
          {renderContent.hubLines}
          {renderContent.nodeSpokes}
          {renderContent.connections}
          {dragMode === 'linking' && linkingSourceNode && (
            <line
              x1={draggingNodesPos[linkingSourceNode.formId]?.x ?? linkingSourceNode.x}
              y1={draggingNodesPos[linkingSourceNode.formId]?.y ?? linkingSourceNode.y}
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

        {renderContent.nodes}

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
