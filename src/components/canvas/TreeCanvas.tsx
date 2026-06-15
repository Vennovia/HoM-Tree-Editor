"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'

interface TreeCanvasProps {
  schoolName: string;
  school: SpellSchool;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export function TreeCanvas({ schoolName, school, selectedNodeId, onSelectNode }: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset transform when school changes to focus on root
  useEffect(() => {
    const rootNode = school.nodes.find(n => n.formId === school.root);
    if (rootNode) {
      setTransform({
        x: -rootNode.x * 0.5 + (containerRef.current?.clientWidth || 0) / 2,
        y: -rootNode.y * 0.5 + (containerRef.current?.clientHeight || 0) / 2,
        scale: 0.5
      });
    }
  }, [schoolName]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.05), 5);
    
    // Zoom towards mouse position
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
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.5"
            />
          );
        }
      });
    });
    return lines;
  }, [school]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background cursor-crosshair"
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
            onClick={() => onSelectNode(node.formId)}
            className={cn(
              "absolute flex items-center justify-center p-3 rounded-full border-2 bg-card cursor-pointer transition-all hover:scale-110 pointer-events-auto arcane-glow select-none",
              selectedNodeId === node.formId ? "node-selected ring-2 ring-accent ring-offset-2 ring-offset-background z-20" : "border-primary/50",
              node.isRoot && "border-accent shadow-[0_0_10px_hsl(var(--accent))]"
            )}
            style={{ 
              left: node.x, 
              top: node.y, 
              transform: 'translate(-50%, -50%)',
              width: node.isRoot ? 80 : 60,
              height: node.isRoot ? 80 : 60,
            }}
          >
            <span className="text-[10px] text-center font-bold truncate leading-tight w-full px-1">
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

      <div className="absolute bottom-4 left-4 flex flex-col gap-1 p-3 bg-card/80 border border-border rounded-lg backdrop-blur-sm pointer-events-none">
        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{schoolName} School</h3>
        <p className="text-[10px] text-muted-foreground">{school.nodes.length} Nodes Loaded</p>
        <p className="text-[10px] text-accent/80 font-mono">Zoom: {(transform.scale * 100).toFixed(0)}%</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"/> <span className="text-[9px]">Master</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"/> <span className="text-[9px]">Expert</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> <span className="text-[9px]">Adept</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/> <span className="text-[9px]">Apprentice</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500"/> <span className="text-[9px]">Novice</span></div>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 p-3 bg-card/80 border border-border rounded-lg backdrop-blur-sm">
        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Controls</p>
        <p className="text-[10px] text-muted-foreground italic">Middle Mouse / Alt+Left: Pan</p>
        <p className="text-[10px] text-muted-foreground italic">Wheel: Zoom</p>
      </div>
    </div>
  )
}
