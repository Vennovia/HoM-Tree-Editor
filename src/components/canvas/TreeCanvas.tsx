"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface TreeCanvasProps {
  schoolName: string;
  school: SpellSchool;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onNodeMove: (nodeId: string, updates: Partial<SpellNode>, schoolName: string) => void;
  onLinkNodes: (sourceId: string, targetId: string) => void;
  searchQuery?: string;
  showRadialGuides?: boolean;
}

export function TreeCanvas({ 
  schoolName, 
  school, 
  selectedNodeId, 
  onSelectNode, 
  onNodeMove,
  onLinkNodes,
  searchQuery = '',
  showRadialGuides = false
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | 'linking' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodeInitialPos, setDragNodeInitialPos] = useState({ x: 0, y: 0 });
  
  const [draggingNodePos, setDraggingNodePos] = useState<{ x: number, y: number } | null>(null);

  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const lastCenteredId = useRef<string | null>(null);
  const currentSchoolName = useRef<string | null>(null);

  // Only center the view when the school actually changes
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

  // Center on selected node only if it was selected via search/external and we aren't dragging
  useEffect(() => {
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
    
    if (!selectedNodeId) {
      lastCenteredId.current = null;
    }
  }, [selectedNodeId, school, dragMode]);

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

    if (e.shiftKey && nodeId) {
      setDragMode('linking');
      setLinkingSourceId(nodeId);
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);
      return;
    }

    if (nodeId) {
      const foundNode = school.nodes.find(n => n.formId === nodeId);
      if (foundNode) {
        if (!foundNode.isLocked) {
          setDragMode('node');
          setDragNodeId(nodeId);
          setDragNodeInitialPos({ x: foundNode.x, y: foundNode.y });
          setDragStart({ x: e.clientX, y: e.clientY });
          setDraggingNodePos({ x: foundNode.x, y: foundNode.y });
        }
        // Mark as already handled centering for this click
        lastCenteredId.current = nodeId;
        onSelectNode(nodeId);
      }
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
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
    if (dragMode === 'node' && dragNodeId && draggingNodePos) {
      onNodeMove(dragNodeId, draggingNodePos, schoolName);
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
    if (!school) return { nodes: [], connections: [], radialGuides: [], spokes: [] };
    const nodes: React.ReactNode[] = [];
    const connections: React.ReactNode[] = [];
    const radialGuides: React.ReactNode[] = [];
    const spokes: React.ReactNode[] = [];

    const schoolRoots = school.roots || [];
    const prereqNodeIds = new Set<string>();
    const childNodeIds = new Set<string>();
    if (selectedNodeId) {
      const selectedNode = school.nodes.find(n => n.formId === selectedNodeId);
      if (selectedNode) {
        selectedNode.children?.forEach(id => childNodeIds.add(id));
        selectedNode.prerequisites?.forEach(id => prereqNodeIds.add(id));
        selectedNode.hardPrereqs?.forEach(id => prereqNodeIds.add(id));
        selectedNode.softPrereqs?.forEach(id => prereqNodeIds.add(id));
      }
    }

    // Add Arcane Spokes (every 15 degrees)
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
          stroke={isMajor ? "hsl(var(--accent) / 0.25)" : isSemiMajor ? "hsl(var(--accent) / 0.15)" : "hsl(var(--accent) / 0.08)"}
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

    const connectionsData: Array<{ source: SpellNode, target: SpellNode, isHighlighted: boolean, isPrereqPath: boolean, isChildPath: boolean }> = [];
    school.nodes.forEach(node => {
      (node.children || []).forEach(childId => {
        const childNode = school.nodes.find(n => n.formId === childId);
        if (childNode) {
          const isChildPath = selectedNodeId === node.formId;
          const isPrereqPath = selectedNodeId === childId;
          const isHighlighted = isChildPath || isPrereqPath;
          connectionsData.push({ source: node, target: childNode, isHighlighted, isPrereqPath, isChildPath });
        }
      });
    });

    connectionsData.sort((a, b) => (a.isHighlighted === b.isHighlighted ? 0 : a.isHighlighted ? 1 : -1));

    connectionsData.forEach(({ source, target, isHighlighted, isPrereqPath, isChildPath }) => {
      const sX = (dragNodeId === source.formId && draggingNodePos) ? draggingNodePos.x : source.x;
      const sY = (dragNodeId === source.formId && draggingNodePos) ? draggingNodePos.y : source.y;
      const tX = (dragNodeId === target.formId && draggingNodePos) ? draggingNodePos.x : target.x;
      const tY = (dragNodeId === target.formId && draggingNodePos) ? draggingNodePos.y : target.y;

      const dx = tX - sX;
      const dy = tY - sY;
      const angle = Math.atan2(dy, dx);
      const isRoot = schoolRoots.includes(target.formId);
      const targetRadius = (isRoot ? 27 : 20) + 4;
      
      const x2 = tX - targetRadius * Math.cos(angle);
      const y2 = tY - targetRadius * Math.sin(angle);

      const strokeColor = isPrereqPath ? "#22c55e" : (isChildPath ? "#f97316" : "hsl(var(--primary))");
      const markerId = isPrereqPath ? "url(#arrow-prereq)" : (isChildPath ? "url(#arrow-child)" : "url(#arrow-default)");

      connections.push(
        <g key={`${source.formId}-${target.formId}`} className="group/line cursor-pointer">
          <line
            x1={sX} y1={sY}
            x2={tX} y2={tY}
            stroke="transparent"
            strokeWidth="20"
            className="pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onLinkNodes(source.formId, target.formId);
            }}
          />
          <line
            x1={sX} y1={sY}
            x2={x2} y2={y2}
            stroke={strokeColor}
            strokeWidth={isHighlighted ? "2.5" : "1.5"}
            strokeOpacity={isHighlighted ? "0.9" : "0.4"}
            markerEnd={markerId}
            className={cn(
              "transition-all duration-300",
              !isHighlighted && "group-hover/line:stroke-destructive group-hover/line:stroke-opacity-100 group-hover/line:stroke-[2px]",
              isHighlighted && "animate-pulse"
            )}
          />
        </g>
      );
    });

    school.nodes.forEach(node => {
      const isMatch = searchQuery.length > 1 && (
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        node.formId.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const isRoot = schoolRoots.includes(node.formId);
      const isSelected = selectedNodeId === node.formId;
      const isPrereq = prereqNodeIds.has(node.formId);
      const isChild = childNodeIds.has(node.formId);
      
      const x = (dragNodeId === node.formId && draggingNodePos) ? draggingNodePos.x : node.x;
      const y = (dragNodeId === node.formId && draggingNodePos) ? draggingNodePos.y : node.y;

      nodes.push(
        <div
          key={node.formId}
          data-node-id={node.formId}
          className={cn(
            "spell-node absolute flex items-center justify-center p-1.5 rounded-full border bg-card cursor-grab hover:scale-110 pointer-events-auto arcane-glow select-none group transition-transform duration-200 ease-out",
            (dragMode === 'node' || draggingNodePos) && "transition-none",
            node.isLocked && "cursor-default hover:scale-100",
            isSelected ? "node-selected ring-2 ring-accent ring-offset-1 ring-offset-background z-30" : "border-primary/40",
            isPrereq && !isSelected && "border-[#22c55e] ring-2 ring-[#22c55e]/50 z-20 scale-105",
            isChild && !isSelected && "border-[#f97316] ring-2 ring-[#f97316]/50 z-20 scale-105",
            isRoot && "border-accent shadow-[0_0_15px_hsl(var(--accent))] z-10",
            linkingSourceId === node.formId && "ring-2 ring-accent ring-offset-2 animate-pulse z-40",
            dragNodeId === node.formId && "cursor-grabbing scale-110 opacity-80 z-50",
            isMatch && "node-pulse ring-2 ring-yellow-400 border-yellow-400 z-50 scale-125 shadow-[0_0_20px_hsl(48_100%_50%)]"
          )}
          style={{ 
            left: x, 
            top: y, 
            transform: 'translate(-50%, -50%)',
            width: isRoot ? 54 : 40,
            height: isRoot ? 54 : 40,
          }}
        >
          <span className={cn(
            "text-center font-bold truncate leading-tight w-full px-0.5 pointer-events-none group-hover:whitespace-normal group-hover:bg-card/95 group-hover:absolute group-hover:z-50 group-hover:p-1 group-hover:rounded group-hover:border group-hover:border-border",
            isRoot ? "text-[9px]" : "text-[8px]"
          )}>
            {node.name}
          </span>
          <div 
            className={cn(
              "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background shadow-sm",
              node.skillLevel === 'Master' ? "bg-yellow-500" :
              node.skillLevel === 'Expert' ? "bg-purple-500" :
              node.skillLevel === 'Adept' ? "bg-blue-500" :
              node.skillLevel === 'Apprentice' ? "bg-green-500" : "bg-gray-500"
            )} 
          />
          {node.isLocked && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-background/80 rounded-full p-0.5 border border-border">
              <Lock className="w-2 h-2 text-muted-foreground" />
            </div>
          )}
        </div>
      );
    });

    return { nodes, connections, radialGuides, spokes };
  }, [school, selectedNodeId, linkingSourceId, dragNodeId, dragMode, searchQuery, showRadialGuides, onLinkNodes, draggingNodePos]);

  const activeLinkingLine = useMemo(() => {
    if (dragMode !== 'linking' || !linkingSourceId) return null;
    const sourceNode = school?.nodes.find(n => n.formId === linkingSourceId);
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
  }, [dragMode, linkingSourceId, mousePos, school]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background cursor-crosshair",
        dragMode === 'canvas' && "cursor-grabbing",
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

        <svg 
          className="absolute overflow-visible"
          style={{ width: 1, height: 1 }}
        >
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" fillOpacity="0.4" />
            </marker>
            <marker
              id="arrow-child"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
            </marker>
            <marker
              id="arrow-prereq"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
            </marker>
          </defs>
          {renderData.spokes}
          {renderData.radialGuides}
          {renderData.connections}
          {activeLinkingLine}
        </svg>
        {renderData.nodes}
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-1 p-3 bg-card/80 border border-border rounded-lg backdrop-blur-sm pointer-events-none">
        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{schoolName}</h3>
        <p className="text-[10px] text-muted-foreground">{school?.nodes.length || 0} Nodes Mapped</p>
        <p className="text-[10px] text-accent/80 font-mono">Zoom: {(transform.scale * 100).toFixed(0)}%</p>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 p-3 bg-card/80 border border-border rounded-lg backdrop-blur-sm shadow-xl">
        <p className="text-[9px] text-muted-foreground uppercase font-semibold border-b border-border pb-1">Controls</p>
        <div className="space-y-1.5">
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Drag</span> Move
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Ctrl + Drag</span> Snap to {showRadialGuides ? 'Rings' : 'Grid'}
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Shift + Drag</span> Link
          </p>
        </div>
      </div>
    </div>
  )
}
