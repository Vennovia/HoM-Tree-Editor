
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
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.2 });
  const [dragMode, setDragMode] = useState<'canvas' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate layout: Place school starting nodes around the center hub
  const layout = useMemo(() => {
    const HUB_RADIUS = 350;
    const keys = Object.keys(schools);
    const schoolLayouts: Record<string, { offset: { x: number, y: number }, rootPos: { x: number, y: number } }> = {};

    keys.forEach((key, i) => {
      const school = schools[key];
      const rootNode = school.nodes.find(n => n.formId === school.root);
      const angle = (i * 2 * Math.PI) / keys.length;
      
      const targetRootX = Math.cos(angle) * HUB_RADIUS;
      const targetRootY = Math.sin(angle) * HUB_RADIUS;

      if (rootNode) {
        schoolLayouts[key] = {
          offset: {
            x: targetRootX - rootNode.x,
            y: targetRootY - rootNode.y
          },
          rootPos: { x: targetRootX, y: targetRootY }
        };
      }
    });

    return schoolLayouts;
  }, [schools]);

  useEffect(() => {
    // Initial centering
    if (containerRef.current) {
      setTransform({
        x: containerRef.current.clientWidth / 2,
        y: containerRef.current.clientHeight / 2,
        scale: 0.25
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && !e.shiftKey)) {
      const target = e.target as HTMLElement;
      if (target.closest('.spell-node')) return; // Let clicks on nodes pass through if needed

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
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.02), 2);
    
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
    const labels: React.ReactNode[] = [];

    Object.entries(schools).forEach(([sName, sData]) => {
      const { offset, rootPos } = layout[sName] || { offset: { x: 0, y: 0 }, rootPos: { x: 0, y: 0 } };

      // Line from Heart to School Root
      hubLines.push(
        <line
          key={`hub-${sName}`}
          x1={0} y1={0}
          x2={rootPos.x} y2={rootPos.y}
          stroke="hsl(var(--accent))"
          strokeWidth="4"
          strokeOpacity="0.3"
          strokeDasharray="10,10"
          className="animate-pulse"
        />
      );

      // School connections
      sData.nodes.forEach(node => {
        node.children.forEach(childId => {
          const childNode = sData.nodes.find(n => n.formId === childId);
          if (childNode) {
            connections.push(
              <line
                key={`${sName}-${node.formId}-${childId}`}
                x1={node.x + offset.x}
                y1={node.y + offset.y}
                x2={childNode.x + offset.x}
                y2={childNode.y + offset.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeOpacity="0.4"
              />
            );
          }
        });
      });

      // School nodes
      sData.nodes.forEach(node => {
        const isRoot = node.formId === sData.root;
        const isMatch = searchQuery.length > 1 && (
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          node.formId.toLowerCase().includes(searchQuery.toLowerCase())
        );

        nodes.push(
          <div
            key={`${sName}-${node.formId}`}
            onClick={() => onSelectNode(node.formId)}
            className={cn(
              "spell-node absolute flex items-center justify-center rounded-full border bg-card/80 transition-all pointer-events-auto arcane-glow cursor-pointer",
              selectedNodeId === node.formId ? "ring-4 ring-accent z-20" : "border-border hover:border-accent",
              isRoot && "scale-125 border-accent bg-accent/10 z-10",
              isMatch && "ring-4 ring-yellow-400 scale-150 z-30"
            )}
            style={{
              left: node.x + offset.x,
              top: node.y + offset.y,
              width: isRoot ? 80 : 50,
              height: isRoot ? 80 : 50,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-[10px] font-bold text-center px-2 truncate">{node.name}</span>
          </div>
        );
      });

      // Label for the school
      labels.push(
        <div 
          key={`label-${sName}`}
          className="absolute text-4xl font-black text-accent/5 uppercase tracking-[0.5em] pointer-events-none select-none"
          style={{ 
            left: rootPos.x, 
            top: rootPos.y - 300,
            transform: 'translateX(-50%)'
          }}
        >
          {sName}
        </div>
      );
    });

    return { nodes, connections, hubLines, labels };
  }, [schools, layout, selectedNodeId, searchQuery, onSelectNode]);

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

        {/* The Heart of Magic */}
        <div 
          className="absolute w-64 h-64 rounded-full bg-background border-[12px] border-accent heart-glow flex items-center justify-center z-50 pointer-events-none"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
        >
          <div className="text-center">
            <div className="text-xs font-black tracking-[0.5em] text-accent uppercase animate-pulse">Heart of</div>
            <div className="text-4xl font-black tracking-tighter text-foreground uppercase">Magic</div>
          </div>
        </div>

        {renderContent.labels}
        {renderContent.nodes}
      </div>
      
      <div className="absolute top-6 left-6 p-4 bg-card/50 backdrop-blur-md border border-border rounded-xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-accent">Arch-Grimoire Overview</h2>
        <p className="text-[10px] text-muted-foreground mt-1">Converging {Object.keys(schools).length} magical lineages around the Heart.</p>
      </div>
    </div>
  )
}
