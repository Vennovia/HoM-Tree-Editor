
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'

interface TreeCanvasProps {
  schoolName: string;
  school: SpellSchool;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onNodeMove: (nodeId: string, updates: Partial<SpellNode>) => void;
  onLinkNodes: (sourceId: string, targetId: string) => void;
  searchQuery?: string;
}

export function TreeCanvas({ 
  schoolName, 
  school, 
  selectedNodeId, 
  onSelectNode, 
  onNodeMove,
  onLinkNodes,
  searchQuery = ''
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | 'linking' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodeInitialPos, setDragNodeInitialPos] = useState({ x: 0, y: 0 });
  
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Center camera when school changes
  useEffect(() => {
    if (school) {
      const rootNode = school.nodes.find(n => n.formId === school.root);
      if (rootNode) {
        setTransform({
          x: -rootNode.x * 0.5 + (containerRef.current?.clientWidth || 0) / 2,
          y: -rootNode.y * 0.5 + (containerRef.current?.clientHeight || 0) / 2,
          scale: 0.5
        });
      }
    }
  }, [schoolName]);

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
      setDragMode('node');
      setDragNodeId(nodeId);
      const foundNode = school.nodes.find(n => n.formId === nodeId);
      if (foundNode) {
        setDragNodeInitialPos({ x: foundNode.x, y: foundNode.y });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
      onSelectNode(nodeId);
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
      
      onNodeMove(dragNodeId, {
        x: Math.round(dragNodeInitialPos.x + dx),
        y: Math.round(dragNodeInitialPos.y + dy)
      });
    } else if (dragMode === 'linking') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMousePos(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
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
    if (!school) return { nodes: [], connections: [] };
    const nodes: React.ReactNode[] = [];
    const connections: React.ReactNode[] = [];

    school.nodes.forEach(node => {
      node.children.forEach(childId => {
        const childNode = school.nodes.find(n => n.formId === childId);
        if (childNode) {
          connections.push(
            <g key={`${node.formId}-${childId}`} className="group/line cursor-pointer">
              <line
                x1={node.x}
                y1={node.y}
                x2={childNode.x}
                y2={childNode.y}
                stroke="transparent"
                strokeWidth="20"
                className="pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkNodes(node.formId, childId);
                }}
              />
              <line
                x1={node.x}
                y1={node.y}
                x2={childNode.x}
                y2={childNode.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeOpacity="0.5"
                className="transition-all duration-300 group-hover/line:stroke-destructive group-hover/line:stroke-opacity-100 group-hover/line:stroke-[3px]"
              />
            </g>
          );
        }
      });
    });

    school.nodes.forEach(node => {
      const isMatch = searchQuery.length > 1 && (
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        node.formId.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const isRoot = node.formId === school.root;

      nodes.push(
        <div
          key={node.formId}
          data-node-id={node.formId}
          className={cn(
            "spell-node absolute flex items-center justify-center p-3 rounded-full border-2 bg-card cursor-grab hover:scale-110 pointer-events-auto arcane-glow select-none group transition-transform duration-200 ease-out",
            dragMode === 'node' && "transition-none",
            selectedNodeId === node.formId ? "node-selected ring-2 ring-accent ring-offset-2 ring-offset-background z-20" : "border-primary/50",
            isRoot && "border-accent shadow-[0_0_20px_hsl(var(--accent))] z-10",
            linkingSourceId === node.formId && "ring-4 ring-accent ring-offset-4 animate-pulse z-30",
            dragNodeId === node.formId && "cursor-grabbing scale-110 opacity-80 z-40",
            isMatch && "node-pulse ring-4 ring-yellow-400 border-yellow-400 z-50 scale-125 shadow-[0_0_30px_hsl(48_100%_50%)]"
          )}
          style={{ 
            left: node.x, 
            top: node.y, 
            transform: 'translate(-50%, -50%)',
            width: isRoot ? 80 : 60,
            height: isRoot ? 80 : 60,
          }}
        >
          <span className={cn(
            "text-center font-bold truncate leading-tight w-full px-1 group-hover:whitespace-normal group-hover:bg-card/90 group-hover:p-1 group-hover:rounded",
            isRoot ? "text-xs" : "text-[10px]"
          )}>
            {node.name}
          </span>
          <div 
            className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full border border-background",
              node.skillLevel === 'Master' ? "bg-yellow-500" :
              node.skillLevel === 'Expert' ? "bg-purple-500" :
              node.skillLevel === 'Adept' ? "bg-blue-500" :
              node.skillLevel === 'Apprentice' ? "bg-green-500" : "bg-gray-500"
            )} 
          />
        </div>
      );
    });

    return { nodes, connections };
  }, [school, selectedNodeId, linkingSourceId, dragNodeId, dragMode, searchQuery, onLinkNodes]);

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
        strokeWidth="3"
        strokeDasharray="5,5"
        className="animate-pulse"
      />
    );
  }, [dragMode, linkingSourceId, mousePos, school]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background arcane-grid cursor-crosshair",
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
        <svg 
          className="absolute overflow-visible"
          style={{ width: 1, height: 1 }}
        >
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
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Drag</span> Move Node
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Shift + Drag</span> Link Nodes
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Click Link</span> Delete Connection
          </p>
        </div>
      </div>
    </div>
  )
}
