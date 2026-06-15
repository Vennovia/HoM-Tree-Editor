
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

interface TransformedNode extends SpellNode {
  schoolName: string;
  globalX: number;
  globalY: number;
}

export function GlobalGrimoireView({ 
  schools, 
  selectedNodeId, 
  onSelectNode, 
  searchQuery = ''
}: GlobalGrimoireViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.15 });
  const [dragMode, setDragMode] = useState<'canvas' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // HUB_RADIUS is the distance from the center to the root nodes
  const HUB_RADIUS = 600;

  // Calculate global positions for all nodes across all schools
  const transformedData = useMemo(() => {
    const allNodes: TransformedNode[] = [];
    const schoolKeys = Object.keys(schools);
    const totalSchools = schoolKeys.length;

    schoolKeys.forEach((sName, i) => {
      const school = schools[sName];
      const rootNode = school.nodes.find(n => n.formId === school.root);
      if (!rootNode) return;

      // Calculate the angle for this school's "spoke"
      const angle = (i * 2 * Math.PI) / totalSchools;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Center of the school's starting point
      const targetRootX = cosA * HUB_RADIUS;
      const targetRootY = sinA * HUB_RADIUS;

      school.nodes.forEach(node => {
        // Calculate relative position to the root in original coordinates
        const relX = node.x - rootNode.x;
        const relY = node.y - rootNode.y;

        // Rotate the relative vector so it points "outward" 
        // We assume the original layout flows generally in a consistent direction (e.g., +X or +Y)
        // Rotating the coordinate space by 'angle' maps the school's internal axis to the radial axis
        const rotatedX = relX * cosA - relY * sinA;
        const rotatedY = relX * sinA + relY * cosA;

        allNodes.push({
          ...node,
          schoolName: sName,
          globalX: targetRootX + rotatedX,
          globalY: targetRootY + rotatedY
        });
      });
    });

    return allNodes;
  }, [schools]);

  useEffect(() => {
    if (containerRef.current) {
      setTransform({
        x: containerRef.current.clientWidth / 2,
        y: containerRef.current.clientHeight / 2,
        scale: 0.2
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && !e.shiftKey)) {
      const target = e.target as HTMLElement;
      if (target.closest('.spell-node')) return;

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
    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.01), 2);
    
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

    // Group nodes by school for rendering connections easily
    const nodesBySchool = transformedData.reduce((acc, node) => {
      if (!acc[node.schoolName]) acc[node.schoolName] = [];
      acc[node.schoolName].push(node);
      return acc;
    }, {} as Record<string, TransformedNode[]>);

    Object.entries(nodesBySchool).forEach(([sName, sNodes]) => {
      const schoolRoot = sNodes.find(n => n.formId === schools[sName].root);
      if (!schoolRoot) return;

      // Spectral line from Heart to Root
      hubLines.push(
        <line
          key={`hub-${sName}`}
          x1={0} y1={0}
          x2={schoolRoot.globalX} y2={schoolRoot.globalY}
          stroke="hsl(var(--accent))"
          strokeWidth="6"
          strokeOpacity="0.2"
          strokeDasharray="15,15"
          className="animate-pulse"
        />
      );

      // Connections
      sNodes.forEach(node => {
        node.children.forEach(childId => {
          const childNode = sNodes.find(n => n.formId === childId);
          if (childNode) {
            connections.push(
              <line
                key={`${sName}-${node.formId}-${childId}`}
                x1={node.globalX}
                y1={node.globalY}
                x2={childNode.globalX}
                y2={childNode.globalY}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeOpacity="0.3"
              />
            );
          }
        });
      });

      // Nodes
      sNodes.forEach(node => {
        const isRoot = node.formId === schools[sName].root;
        const isMatch = searchQuery.length > 1 && (
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          node.formId.toLowerCase().includes(searchQuery.toLowerCase())
        );

        nodes.push(
          <div
            key={`${sName}-${node.formId}`}
            onClick={() => onSelectNode(node.formId)}
            className={cn(
              "spell-node absolute flex items-center justify-center rounded-full border bg-card/90 transition-all pointer-events-auto arcane-glow cursor-pointer",
              selectedNodeId === node.formId ? "ring-4 ring-accent z-20" : "border-border hover:border-accent",
              isRoot && "scale-125 border-accent bg-accent/20 z-10 shadow-[0_0_30px_hsl(var(--accent)/0.4)]",
              isMatch && "ring-4 ring-yellow-400 scale-150 z-30 shadow-[0_0_40px_rgba(250,204,21,0.5)]"
            )}
            style={{
              left: node.globalX,
              top: node.globalY,
              width: isRoot ? 100 : 60,
              height: isRoot ? 100 : 60,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className={cn(
              "font-bold text-center px-2 truncate leading-tight",
              isRoot ? "text-xs" : "text-[10px]"
            )}>
              {node.name}
            </span>
          </div>
        );
      });

      // School Label (Positioned further out than the root)
      const labelDist = HUB_RADIUS - 200;
      const angle = (Object.keys(schools).indexOf(sName) * 2 * Math.PI) / Object.keys(schools).length;
      labels.push(
        <div 
          key={`label-${sName}`}
          className="absolute text-5xl font-black text-accent/10 uppercase tracking-[0.4em] pointer-events-none select-none whitespace-nowrap"
          style={{ 
            left: Math.cos(angle) * labelDist, 
            top: Math.sin(angle) * labelDist,
            transform: `translate(-50%, -50%) rotate(${angle + Math.PI/2}rad)`
          }}
        >
          {sName}
        </div>
      );
    });

    return { nodes, connections, hubLines, labels };
  }, [transformedData, schools, selectedNodeId, searchQuery, onSelectNode]);

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
          className="absolute w-80 h-80 rounded-full bg-background border-[16px] border-accent heart-glow flex items-center justify-center z-50 pointer-events-none"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
        >
          <div className="text-center">
            <div className="text-sm font-black tracking-[0.6em] text-accent uppercase animate-pulse mb-1">Heart of</div>
            <div className="text-5xl font-black tracking-tighter text-foreground uppercase">Magic</div>
          </div>
        </div>

        {renderContent.labels}
        {renderContent.nodes}
      </div>
      
      <div className="absolute top-6 left-6 p-4 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-2xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-accent">Arch-Grimoire Hub</h2>
        <p className="text-[10px] text-muted-foreground mt-1">Converging {Object.keys(schools).length} magical lineages around the Heart.</p>
        <div className="mt-3 space-y-1">
          <p className="text-[9px] text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Radiating structures are transformed for radial clarity.
          </p>
        </div>
      </div>
    </div>
  )
}
