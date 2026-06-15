
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { cn } from '@/lib/utils'

interface GlobalGrimoireViewProps {
  schools: Record<string, SpellSchool>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  searchQuery?: string;
}

export function GlobalGrimoireView({ 
  schools, 
  selectedNodeId, 
  onSelectNode, 
  searchQuery = ''
}: GlobalGrimoireViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.25 });
  const [dragMode, setDragMode] = useState<'canvas' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setTransform({
        x: containerRef.current.clientWidth / 2,
        y: containerRef.current.clientHeight / 2,
        scale: 0.25
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      if ((e.target as HTMLElement).closest('.spell-node')) return;
      setDragMode('canvas');
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragMode === 'canvas') {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => setDragMode(null);

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

    Object.entries(schools).forEach(([sName, school]) => {
      const rootId = school.root;
      const schoolRoot = school.nodes.find(n => n.formId === rootId);
      
      // Connect hub (0,0) to root of school
      if (schoolRoot) {
        hubLines.push(
          <line
            key={`hub-${sName}`}
            x1={0} y1={0}
            x2={schoolRoot.x} y2={schoolRoot.y}
            stroke="hsl(var(--accent))"
            strokeWidth="4"
            strokeOpacity="0.15"
            strokeDasharray="12,12"
            className="animate-pulse"
          />
        );
      }

      school.nodes.forEach(node => {
        // Render progression lines
        node.children.forEach(childId => {
          const childNode = school.nodes.find(n => n.formId === childId);
          if (childNode) {
            const isHighlighted = selectedNodeId === node.formId || selectedNodeId === childId;
            connections.push(
              <line
                key={`${sName}-${node.formId}-${childId}`}
                x1={node.x} y1={node.y}
                x2={childNode.x} y2={childNode.y}
                stroke={isHighlighted ? "#f97316" : "hsl(var(--primary))"}
                strokeWidth={isHighlighted ? "3" : "1"}
                strokeOpacity={isHighlighted ? "0.8" : "0.2"}
              />
            );
          }
        });

        const isRoot = node.formId === rootId;
        const isMatch = searchQuery.length > 1 && (
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.formId.toLowerCase().includes(searchQuery.toLowerCase())
        );

        nodes.push(
          <div
            key={`${sName}-${node.formId}`}
            onClick={() => onSelectNode(node.formId)}
            className={cn(
              "spell-node absolute flex items-center justify-center rounded-full border bg-card/90 transition-all cursor-pointer pointer-events-auto",
              selectedNodeId === node.formId ? "ring-2 ring-accent z-20 scale-125" : "border-border hover:border-accent/60",
              isRoot && "border-accent bg-accent/5 scale-125 z-10 shadow-[0_0_15px_hsl(var(--accent)/0.2)]",
              isMatch && "ring-4 ring-yellow-400 scale-150 z-30"
            )}
            style={{
              left: node.x,
              top: node.y,
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
          </div>
        );
      });
    });

    return { nodes, connections, hubLines };
  }, [schools, selectedNodeId, searchQuery, onSelectNode]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="absolute origin-top-left transition-transform duration-200 ease-out"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <svg className="absolute overflow-visible" style={{ width: 1, height: 1 }}>
          {renderContent.hubLines}
          {renderContent.connections}
        </svg>

        {/* Central Globe Hub (Radius 45 = Width/Height 90) */}
        <div 
          className="absolute rounded-full border-[8px] border-accent/40 bg-card flex items-center justify-center z-50 pointer-events-none shadow-[0_0_60px_hsl(var(--accent)/0.2)]"
          style={{ 
            left: 0, 
            top: 0, 
            width: 90, 
            height: 90, 
            transform: 'translate(-50%, -50%)' 
          }}
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
        <p className="text-[10px] text-muted-foreground mt-1">Converging lineages from the five ancient schools.</p>
        <div className="flex gap-2 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent/40"></div><span className="text-[9px] text-muted-foreground">Foundation</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary/40"></div><span className="text-[9px] text-muted-foreground">Ability</span></div>
        </div>
      </div>
    </div>
  )
}
