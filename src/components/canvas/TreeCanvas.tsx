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
}

export function TreeCanvas({ 
  schoolName, 
  school, 
  selectedNodeId, 
  onSelectNode, 
  onNodeMove,
  onLinkNodes 
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  
  // States for different types of dragging
  const [dragMode, setDragMode] = useState<'canvas' | 'node' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodeInitialPos, setDragNodeInitialPos] = useState({ x: 0, y: 0 });
  
  // State for linking mode
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

  // Focus on root when school changes
  useEffect(() => {
    const rootNode = school.nodes.find(n => n.formId === school.root);
    if (rootNode) {
      setTransform({
        x: -rootNode.x * 0.5 + (containerRef.current?.clientWidth || 0) / 2,
        y: -rootNode.y * 0.5 + (containerRef.current?.clientHeight || 0) / 2,
        scale: 0.5
      });
    }
  }, [schoolName, school.root, school.nodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNode = target.closest('.spell-node');
    const nodeId = isNode?.getAttribute('data-node-id');

    if (e.shiftKey && nodeId) {
      // Start/End Linking
      if (!linkingSourceId) {
        setLinkingSourceId(nodeId);
      } else {
        if (linkingSourceId !== nodeId) {
          onLinkNodes(linkingSourceId, nodeId);
        }
        setLinkingSourceId(null);
      }
      return;
    }

    if (nodeId) {
      // Start dragging node
      setDragMode('node');
      setDragNodeId(nodeId);
      const node = school.nodes.find(n => n.formId === nodeId);
      if (node) {
        setDragNodeInitialPos({ x: node.x, y: node.y });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
      onSelectNode(nodeId);
      return;
    }

    // Default to canvas pan (Middle mouse or Alt+Left)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDragMode('canvas');
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    } else if (e.button === 0 && !e.shiftKey) {
      // Clear linking if clicking empty space
      setLinkingSourceId(null);
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
    }
  };

  const handleMouseUp = () => {
    setDragMode(null);
    setDragNodeId(null);
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

  const connections = useMemo(() => {
    const lines: React.ReactNode[] = [];
    school.nodes.forEach(node => {
      node.children.forEach(childId => {
        const childNode = school.nodes.find(n => n.formId === childId);
        if (childNode) {
          lines.push(
            <line
              key={`${node.formId}-${childId}`}
              x1={node.x}
              y1={node.y}
              x2={childNode.x}
              y2={childNode.y}
              stroke={linkingSourceId === node.formId || linkingSourceId === childId ? "hsl(var(--accent))" : "hsl(var(--primary))"}
              strokeWidth={linkingSourceId === node.formId || linkingSourceId === childId ? "3" : "2"}
              strokeOpacity={linkingSourceId === node.formId || linkingSourceId === childId ? "1" : "0.5"}
              className="transition-all duration-300"
            />
          );
        }
      });
    });
    return lines;
  }, [school, linkingSourceId]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background cursor-crosshair",
        dragMode === 'canvas' && "cursor-grabbing"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="absolute transition-transform duration-75 ease-out origin-top-left pointer-events-none"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <svg 
          className="absolute overflow-visible"
          style={{ width: 1, height: 1 }}
        >
          {connections}
        </svg>

        {school.nodes.map(node => (
          <div
            key={node.formId}
            data-node-id={node.formId}
            className={cn(
              "spell-node absolute flex items-center justify-center p-3 rounded-full border-2 bg-card cursor-grab transition-all hover:scale-110 pointer-events-auto arcane-glow select-none group",
              selectedNodeId === node.formId ? "node-selected ring-2 ring-accent ring-offset-2 ring-offset-background z-20" : "border-primary/50",
              node.isRoot && "border-accent shadow-[0_0_10px_hsl(var(--accent))]",
              linkingSourceId === node.formId && "ring-4 ring-accent ring-offset-4 animate-pulse z-30",
              dragNodeId === node.formId && "cursor-grabbing scale-110 opacity-80"
            )}
            style={{ 
              left: node.x, 
              top: node.y, 
              transform: 'translate(-50%, -50%)',
              width: node.isRoot ? 80 : 60,
              height: node.isRoot ? 80 : 60,
            }}
          >
            <span className="text-[10px] text-center font-bold truncate leading-tight w-full px-1 group-hover:whitespace-normal group-hover:bg-card/90 group-hover:p-1 group-hover:rounded">
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
        ))}
      </div>

      {/* Info Panels */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 p-3 bg-card/80 border border-border rounded-lg backdrop-blur-sm pointer-events-none">
        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{schoolName} School</h3>
        <p className="text-[10px] text-muted-foreground">{school.nodes.length} Nodes Loaded</p>
        <p className="text-[10px] text-accent/80 font-mono">Zoom: {(transform.scale * 100).toFixed(0)}%</p>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 p-3 bg-card/80 border border-border rounded-lg backdrop-blur-sm shadow-xl">
        <p className="text-[9px] text-muted-foreground uppercase font-semibold border-b border-border pb-1">Controls</p>
        <div className="space-y-1.5">
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Drag</span> Move Node
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Shift + Click</span> Link/Unlink
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Middle / Alt</span> Pan Canvas
          </p>
          <p className="text-[10px] text-foreground flex items-center gap-2">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px] font-mono border border-border">Wheel</span> Zoom
          </p>
        </div>
        {linkingSourceId && (
          <div className="mt-2 pt-2 border-t border-accent/20 bg-accent/5 p-2 rounded animate-pulse">
            <p className="text-[10px] text-accent font-bold">Linking Active</p>
            <p className="text-[9px] text-accent/70">Click another node to connect</p>
          </div>
        )}
      </div>
    </div>
  )
}
