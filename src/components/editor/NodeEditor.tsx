"use client"

import React, { useMemo } from 'react'
import { SpellNode, SpellSchool } from '@/types/spell-tree'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Trash2, Link as LinkIcon, Lock, Unlock, MapPin, X, Star, StarOff, PlusCircle, Fingerprint } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface NodeEditorProps {
  schoolName: string;
  school: SpellSchool;
  node: SpellNode;
  onUpdate: (nodeId: string, updates: Partial<SpellNode>) => void;
  onUpdateSchool: (schoolName: string, updates: Partial<SpellSchool>) => void;
  onToggleRelationship: (nodeId: string, targetId: string, type: 'hard' | 'soft' | 'child' | 'pool') => void;
  onDelete: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export function NodeEditor({ 
  schoolName, 
  school, 
  node, 
  onUpdate, 
  onUpdateSchool,
  onToggleRelationship, 
  onDelete, 
  onSelectNode 
}: NodeEditorProps) {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'x' || name === 'y' || name === 'tier' || name === 'softNeeded') {
      onUpdate(node.formId, { [name]: Number(value) })
    } else {
      onUpdate(node.formId, { [name]: value })
    }
  }

  const renderRelationList = (ids: string[], type: 'hard' | 'soft' | 'child') => {
    if (ids.length === 0) return <p className="text-[10px] text-muted-foreground italic">None</p>

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {ids.map(id => {
          const targetNode = school.nodes.find(n => n.formId === id)
          return (
            <div 
              key={id} 
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-secondary/50 rounded-md border border-border group"
            >
              <button 
                onClick={() => onSelectNode(id)}
                className="text-[10px] font-medium hover:text-accent transition-colors text-left"
              >
                {targetNode?.name || id}
              </button>
              <button 
                onClick={() => onToggleRelationship(node.formId, id, type)}
                className="p-0.5 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  const isRootNode = (school.roots || []).includes(node.formId)

  // ONLY show linked spells (those already in the prerequisites pool but not yet assigned to this category)
  const validHardPrereqs = useMemo(() => {
    const pool = node.prerequisites || [];
    const hard = node.hardPrereqs || [];
    return school.nodes.filter(n => pool.includes(n.formId) && !hard.includes(n.formId));
  }, [school.nodes, node.prerequisites, node.hardPrereqs]);

  const validSoftPrereqs = useMemo(() => {
    const pool = node.prerequisites || [];
    const soft = node.softPrereqs || [];
    return school.nodes.filter(n => pool.includes(n.formId) && !soft.includes(n.formId));
  }, [school.nodes, node.prerequisites, node.softPrereqs]);

  // For the Master Linker: show all nodes that aren't already connected in any way
  const availableToLink = useMemo(() => {
    const existingIds = new Set([
      node.formId,
      ...(node.prerequisites || []),
      ...(node.children || [])
    ]);
    return school.nodes.filter(n => !existingIds.has(n.formId));
  }, [school.nodes, node.formId, node.prerequisites, node.children]);

  const validChildren = useMemo(() => {
    const existingIds = new Set([
      node.formId,
      ...(node.children || []),
      ...(node.prerequisites || []) 
    ]);
    return school.nodes.filter(n => !existingIds.has(n.formId));
  }, [school.nodes, node.formId, node.children, node.prerequisites]);

  const handleToggleRoot = (checked: boolean) => {
    const currentRoots = school.roots || [];
    let newRoots: string[];
    if (checked) {
      newRoots = [...new Set([...currentRoots, node.formId])];
    } else {
      newRoots = currentRoots.filter(id => id !== node.formId);
    }
    onUpdateSchool(schoolName, { roots: newRoots });
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-6 border-b border-border flex justify-between items-center bg-primary/20">
        <div>
          <h2 className="text-xl font-headline font-bold text-accent">Node Editor</h2>
          <div className="flex items-center gap-1.5 mt-1 opacity-60">
            <Fingerprint className="w-3 h-3" />
            <span className="text-[10px] font-mono tracking-tighter uppercase">Reference Data</span>
          </div>
        </div>
        <Button variant="destructive" size="icon" onClick={() => onDelete(node.formId)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-widest font-bold">Display Name</Label>
              <Input 
                name="name" 
                value={node.name} 
                onChange={handleChange} 
                className="bg-background border-border focus:ring-accent" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-widest font-bold">Form ID</Label>
              <Input 
                name="formId" 
                value={node.formId} 
                onChange={handleChange} 
                className="bg-background border-border font-mono text-xs focus:ring-accent" 
              />
              <p className="text-[9px] text-muted-foreground opacity-60 leading-tight">Changing this will update all arcane references throughout the grimoire.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-widest font-bold">Skill Level</Label>
                <Select value={node.skillLevel} onValueChange={(val) => onUpdate(node.formId, { skillLevel: val })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novice">Novice</SelectItem>
                    <SelectItem value="Apprentice">Apprentice</SelectItem>
                    <SelectItem value="Adept">Adept</SelectItem>
                    <SelectItem value="Expert">Expert</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-widest font-bold">Tier</Label>
                <Input type="number" name="tier" value={node.tier} onChange={handleChange} className="bg-background border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-widest font-bold">Theme (Glyph)</Label>
              <Input name="theme" value={node.theme} onChange={handleChange} className="bg-background border-border" />
            </div>
          </div>

          <Separator className="bg-border" />

          {/* School Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/20">
              <div className="flex items-center gap-2">
                {isRootNode ? <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
                <Label htmlFor="root-toggle" className="text-xs font-bold uppercase tracking-wider">School Root</Label>
              </div>
              <Switch 
                id="root-toggle" 
                checked={isRootNode} 
                onCheckedChange={handleToggleRoot}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                {node.isLocked ? <Lock className="w-3.5 h-3.5 text-accent" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
                <Label htmlFor="lock-toggle" className="text-xs font-bold uppercase tracking-wider">Lock Position</Label>
              </div>
              <Switch 
                id="lock-toggle" 
                checked={node.isLocked || false} 
                onCheckedChange={(checked) => onUpdate(node.formId, { isLocked: checked })}
              />
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Positioning */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              Coordinates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">X Axis</Label>
                <Input 
                  type="number" 
                  name="x" 
                  value={node.x} 
                  onChange={handleChange} 
                  disabled={node.isLocked}
                  className="bg-background border-border" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Y Axis</Label>
                <Input 
                  type="number" 
                  name="y" 
                  value={node.y} 
                  onChange={handleChange} 
                  disabled={node.isLocked}
                  className="bg-background border-border" 
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Logic & Requirements */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-accent" />
              Arcane Connections
            </h3>

            {/* Hard Prereqs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">Hard Prerequisites</Label>
                <Select onValueChange={(val) => onToggleRelationship(node.formId, val, 'hard')}>
                  <SelectTrigger className="w-32 h-7 text-[9px] bg-secondary/50">
                    <SelectValue placeholder="Assign Linked" />
                  </SelectTrigger>
                  <SelectContent>
                    {validHardPrereqs.length === 0 ? (
                      <div className="p-2 text-[9px] text-muted-foreground text-center italic">No unassigned links</div>
                    ) : (
                      validHardPrereqs.map(n => (
                        <SelectItem key={n.formId} value={n.formId}>{n.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {renderRelationList(node.hardPrereqs || [], 'hard')}
            </div>

            {/* Soft Prereqs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">Soft Prerequisites</Label>
                <Select onValueChange={(val) => onToggleRelationship(node.formId, val, 'soft')}>
                  <SelectTrigger className="w-32 h-7 text-[9px] bg-secondary/50">
                    <SelectValue placeholder="Assign Linked" />
                  </SelectTrigger>
                  <SelectContent>
                    {validSoftPrereqs.length === 0 ? (
                      <div className="p-2 text-[9px] text-muted-foreground text-center italic">No unassigned links</div>
                    ) : (
                      validSoftPrereqs.map(n => (
                        <SelectItem key={n.formId} value={n.formId}>{n.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground shrink-0">Required Count:</Label>
                  <Input 
                    type="number" 
                    name="softNeeded" 
                    value={node.softNeeded} 
                    onChange={handleChange} 
                    className="h-6 w-16 text-[10px] bg-background" 
                  />
                </div>
                {renderRelationList(node.softPrereqs || [], 'soft')}
              </div>
            </div>

            {/* Children */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold">Children (Unlocks)</Label>
                <Select onValueChange={(val) => onToggleRelationship(node.formId, val, 'child')}>
                  <SelectTrigger className="w-32 h-7 text-[9px] bg-secondary/50">
                    <SelectValue placeholder="Add Child" />
                  </SelectTrigger>
                  <SelectContent>
                    {validChildren.length === 0 ? (
                      <div className="p-2 text-[9px] text-muted-foreground text-center italic">No valid spells</div>
                    ) : (
                      validChildren.map(n => (
                        <SelectItem key={n.formId} value={n.formId}>{n.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {renderRelationList(node.children || [], 'child')}
            </div>

            <Separator className="bg-border/50" />

            {/* Master Link Pool Dropdown */}
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-accent">
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Establish New Link</span>
                </div>
                <Select onValueChange={(val) => onToggleRelationship(node.formId, val, 'pool')}>
                  <SelectTrigger className="w-32 h-7 text-[9px] bg-background border-accent/20">
                    <SelectValue placeholder="Pick a Spell" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToLink.length === 0 ? (
                      <div className="p-2 text-[9px] text-muted-foreground text-center italic">All spells linked</div>
                    ) : (
                      availableToLink.map(n => (
                        <SelectItem key={n.formId} value={n.formId}>{n.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                Links establish a base connection. Use the menus above to define them as Hard or Soft requirements.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
