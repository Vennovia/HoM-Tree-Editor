"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface GlobalGrimoireViewProps {
  schools: Record<string, SpellSchool>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onNodeMove: (nodeId: string, updates: Partial<SpellNode>, schoolName: string) => void;
  onLinkNodes: (sourceId: string, targetId: string) => void;
  searchQuery?: string;
  showRadialGuides?: boolean;
}

export function GlobalGrimoireView({ 
  schools, 
  selectedNodeId, 
  onSelectNode, 
  onNodeMove,
  onLinkNodes,
  searchQuery = '',
  showRadialGuides = false
}: GlobalGrimoireViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.25 });
  
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | 'linking' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodeInitialPos, setDragNodeInitialPos] = useState({ x: 0, y: 0 });
  const [dragSchoolName, setDragSchoolName] = useState<string | null>(null);
  
  const [draggingNodePos, setDraggingNodePos] = useState<{ x: number, y: number } | null>(null);

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

    if (e.shiftKey && nodeId) {
      setDragMode('linking');
      setLinkingSourceId(nodeId);
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);
      return;
    }

    if (nodeId) {
      let foundNode: SpellNode | undefined;
      let schoolName: string | undefined;
      for (const sName in schools) {
        foundNode = schools[sName].nodes.find(n => n.formId === nodeId);
        if (foundNode) {
          schoolName = sName;
          break;
        }
      }

      if (foundNode && schoolName) {
        if (!foundNode.isLocked) {
          setDragMode('node');
          setDragNodeId(nodeId);
          setDragSchoolName(schoolName);
          setDragNodeInitialPos({ x: foundNode.x, y: foundNode.y });
          setDragStart({ x: e.clientX, y: e.clientY });
          setDraggingNodePos({ x: foundNode.x, y: foundNode.y });
        }
        onSelectNode(nodeId);
      }
      return;
    }

    if (e.button === 0 || e.button === 1) {
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
      
      let x = Math.round(dragNodeInitialPos.x + dx);
      let y = Math.round(dragNodeInitialPos.y + dy);

      // Adaptive Snapping
      if (e.ctrlKey || e.metaKey) {
        if (showRadialGuides) {
          // Snap to Rings
          const r = Math.sqrt(x * x + y * y);
          const rSnap = Math.round(r / 25) * 25;
          const theta = Math.atan2(y, x);
          x = Math.round(rSnap * Math.cos(theta));
          y = Math.round(rSnap * Math.sin(theta));
        } else {
          // Snap to Square Grid
          x = Math.round(x / 25) * 25;
          y = Math.round(y / 25) * 25;
        }
      }
      
      setDraggingNodePos({ x, y });
    } else if (dragMode === 'linking') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragMode === 'node' && dragNodeId && draggingNodePos && dragSchoolName) {
      onNodeMove(dragNodeId, draggingNodePos, dragSchoolName);
    }

    if (dragMode === 'linking' && linkingSourceId) {
      const target = e.target as HTMLElement;
      const targetNode = target.closest('.spell-node');
      const targetId = targetNode?.getAttribute('data-node-id');

      if (targetId && targetId !== linkingSourceId) {
        onLinkNodes(linkingSourceId, targetId);
      }
    }
    
    setDragMode(null);
    setDragNodeId(null);
    setLinkingSourceId(null);
    setDraggingNodePos(null);
    setDragSchoolName(null);
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

    const prereqNodeIds = new Set<string>();
    const childNodeIds = new Set<string>();
    if (selectedNodeId) {
      let selectedNode: SpellNode | undefined;
      for (const sName in schools) {
        selectedNode = schools[sName].nodes.find(n => n.formId === selectedNodeId);
        if (selectedNode) break;
      }
      if (selectedNode) {
        selectedNode.children?.forEach(id => childNodeIds.add(id));
        selectedNode.prerequisites?.forEach(id => prereqNodeIds.add(id));
        selectedNode.hardPrereqs?.forEach(id => prereqNodeIds.add(id));
        selectedNode.softPrereqs?.forEach(id => prereqNodeIds.add(id));
      }
    }

    // Add Arcane Spokes (every 15 degrees) - Bright Red Color
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
      for (let r = 25; r <= 5000; r += 25) {
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

    Object.entries(schools).forEach(([sName, school]) => {
      const schoolRoots = school.roots || [];
      
      schoolRoots.forEach(rootId => {
        const schoolRoot = school.nodes.find(n => n.formId === rootId);
        if (schoolRoot) {
          const rootX = (dragNodeId === rootId && draggingNodePos) ? draggingNodePos.x : schoolRoot.x;
          const rootY = (dragNodeId === rootId && draggingNodePos) ? draggingNodePos.y : schoolRoot.y;

          hubLines.push(
            <line
              key={`hub-${sName}-${rootId}`}
              x1={0} y1={0}
              x2={rootX} y2={rootY}
              stroke="hsl(var(--accent))"
              strokeWidth="4"
              strokeOpacity="0.15"
              strokeDasharray="12,12"
              className="animate-pulse"
            />
          );
        }
      });

      school.nodes.forEach(node => {
        (node.children || []).forEach(childId => {
          const childNode = school.nodes.find(n => n.formId === childId);
          if (childNode) {
            const isChildPath = selectedNodeId === node.formId;
            const isPrereqPath = selectedNodeId === childId;
            const isHighlighted = isChildPath || isPrereqPath;
            
            const nX = (dragNodeId === node.formId && draggingNodePos) ? draggingNodePos.x : node.x;
            const nY = (dragNodeId === node.formId && draggingNodePos) ? draggingNodePos.y : node.y;
            const cX = (dragNodeId === childId && draggingNodePos) ? draggingNodePos.x : childNode.x;
            const cY = (dragNodeId === childId && draggingNodePos) ? draggingNodePos.y : childNode.y;

            const dx = cX - nX;
            const dy = cY - nY;
            const angle = Math.atan2(dy, dx);
            const isTargetRoot = schoolRoots.includes(childNode.formId);
            const targetRadius = (isTargetRoot ? 27 : 16) + 4;
            
            const x2 = cX - targetRadius * Math.cos(angle);
            const y2 = cY - targetRadius * Math.sin(angle);

            const strokeColor = isPrereqPath ? "#22c55e" : (isChildPath ? "#f97316" : "hsl(var(--primary))");
            const markerId = isPrereqPath ? "url(#arrow-prereq)" : (isChildPath ? "url(#arrow-child)" : "url(#arrow-default)");

            connections.push(
              <line
                key={`${sName}-${node.formId}-${childId}`}
                x1={nX} y1={nY}
                x2={x2} y2={y2}
                stroke={strokeColor}
                strokeWidth={isHighlighted ? "3" : "1"}
                strokeOpacity={isHighlighted ? "0.8" : "0.2"}
                markerEnd={markerId}
              />
            );
          }
        });

        const isRoot = schoolRoots.includes(node.formId);
        const isSelected = selectedNodeId === node.formId;
        const isPrereq = prereqNodeIds.has(node.formId);
        const isChild = childNodeIds.has(node.formId);
        
        const isMatch = searchQuery.length > 1 && (
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.formId.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const x = (dragNodeId === node.formId && draggingNodePos) ? draggingNodePos.x : node.x;
        const y = (dragNodeId === node.formId && draggingNodePos) ? draggingNodePos.y : node.y;

        nodes.push(
          <div
            key={`${sName}-${node.formId}`}
            data-node-id={node.formId}
            onClick={() => onSelectNode(node.formId)}
            className={cn(
              "spell-node absolute flex items-center justify-center rounded-full border bg-card/90 transition-all cursor-grab pointer-events-auto select-none",
              (dragMode === 'node' || draggingNodePos) && "transition-none",
              isSelected ? "node-selected ring-2 ring-accent z-30 scale-125" : "border-border hover:border-accent/60",
              isPrereq && !isSelected && "border-[#22c55e] ring-2 ring-[#22c55e] z-20 scale-110",
              isChild && !isSelected && "border-[#f97316] ring-2 ring-[#f97316]/50 z-20 scale-110",
              isRoot && "border-accent bg-accent/5 scale-125 z-10 shadow-[0_0_15px_hsl(var(--accent)/0.2)]",
              isMatch && "ring-4 ring-yellow-400 scale-150 z-40",
              dragNodeId === node.formId && "cursor-grabbing opacity-70 scale-110",
              node.isLocked && "cursor-default"
            )}
            style={{
              left: x,
              top: y,
              width: isRoot ? 54 : 32,
              height: isRoot ? 54 : 32,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className={cn(
              "font-bold text-center px-1 truncate leading-tight pointer-events-none",
              isRoot ? "text-[9px]" : "text-[7px]"
            )}>
              {node.name}
            </span>
            {node.isLocked && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-background/80 rounded-full p-0.5 border border-border">
                <Lock className="w-1.5 h-1.5 text-muted-foreground" />
              </div>
            )}
          </div>
        );
      });
    });

    return { nodes, connections, hubLines, radialGuides, spokes };
  }, [schools, selectedNodeId, searchQuery, showRadialGuides, onSelectNode, dragNodeId, draggingNodePos, dragMode]);

  const activeLinkingLine = useMemo(() => {
    if (dragMode !== 'linking' || !linkingSourceId) return null;
    let sourceNode: SpellNode | undefined;
    for (const sName in schools) {
      sourceNode = schools[sName].nodes.find(n => n.formId === linkingSourceId);
      if (sourceNode) break;
    }
    if (!sourceNode) return null;

    return (
      <line
        x1={sourceNode.x}
        y1={sourceNode.y}
        x2={mousePos.x}
        y2={mousePos.y}
        stroke="hsl(var(--accent))"
        strokeWidth="2"
        strokeDasharray="4,4"
        className="animate-pulse"
      />
    );
  }, [dragMode, linkingSourceId, mousePos, schools]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing",
        dragMode === 'linking' && "cursor-alias"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
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
          {renderContent.spokes}
          {renderContent.radialGuides}
          {renderContent.hubLines}
          {renderContent.connections}
          {activeLinkingLine}
        </svg>

        <div 
          className="absolute rounded-full border-[8px] border-accent/40 bg-card flex items-center justify-center z-50 pointer-events-none shadow-[0_0_60px_hsl(var(--accent)/0.2)]"
          style={{ left: 0, top: 0, width: 90, height: 90, transform: 'translate(-50%, -50%)' }}
        >
          <div className="text-center">
            <div className="text-[10px] font-black tracking-tighter text-accent uppercase animate-pulse">Core</div>
            <div className="text-sm font-black text-foreground uppercase">Magic</div>
          </div>
        </div>

        {renderContent.nodes}
      </div>
      
      <div className="absolute top-6 left-6 p-4 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-2xl pointer-events-none">
        <h2 className="text-sm font-bold uppercase tracking-widest text-accent">Arch-Grimoire Hub</h2>
        <p className="text-[10px] text-muted-foreground mt-1">Convergence View: Snap to {showRadialGuides ? 'Rings' : 'Grid'} with Ctrl.</p>
        <div className="flex gap-2 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#22c55e]"></div><span className="text-[9px] text-muted-foreground">Prerequisites</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f97316]"></div><span className="text-[9px] text-muted-foreground">Unlocks</span></div>
        </div>
      </div>
    </div>
  )
}
