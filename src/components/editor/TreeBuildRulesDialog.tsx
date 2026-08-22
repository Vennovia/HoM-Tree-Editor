"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TreeBuildRules } from '@/lib/treeBuilder'

interface TreeBuildRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (rules: TreeBuildRules) => void
  spellCount: number
}

export function TreeBuildRulesDialog({ open, onOpenChange, onConfirm, spellCount }: TreeBuildRulesDialogProps) {
  const [tierGap, setTierGap] = useState<TreeBuildRules['tierGap']>(1)
  const [maxChildren, setMaxChildren] = useState(3)
  const [rootCount, setRootCount] = useState(1)
  const [themeMatching, setThemeMatching] = useState(true)
  const [seed, setSeed] = useState<TreeBuildRules['seed']>('random')

  const handleConfirm = () => {
    onConfirm({
      tierGap,
      maxChildren,
      rootCount,
      themeMatching,
      seed,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-accent">Tree Build Rules</DialogTitle>
          <DialogDescription>
            Configure how the spell tree is generated from {spellCount} scanned spells.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tier Linking</Label>
            <Select value={String(tierGap)} onValueChange={(val) => setTierGap(Number(val) as TreeBuildRules['tierGap'])}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Same tier + 1</SelectItem>
                <SelectItem value="2">Same tier + 2</SelectItem>
                <SelectItem value="3">Same tier + 3</SelectItem>
                <SelectItem value="4">Same tier + 4</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Controls which spell tiers a node can link to as a parent.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Root Count Per School</Label>
            <Select value={String(rootCount)} onValueChange={(val) => setRootCount(Number(val))}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Number of top-ranked spells to use as roots for each school.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Children Per Node</Label>
            <Select value={String(maxChildren)} onValueChange={(val) => setMaxChildren(Number(val))}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Maximum number of child nodes any single node can have.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Theme Matching</Label>
              <p className="text-[10px] text-muted-foreground">
                Prefer parents with matching spell themes (e.g., Fire → Fire).
              </p>
            </div>
            <Switch checked={themeMatching} onCheckedChange={setThemeMatching} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Seed</Label>
            <Select value={String(seed)} onValueChange={(val) => setSeed(val === 'random' ? 'random' : Number(val))}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="0">Fixed (0)</SelectItem>
                <SelectItem value="12345">Fixed (12345)</SelectItem>
                <SelectItem value="99999">Fixed (99999)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Random produces a different tree each time. Fixed seeds are reproducible.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>Build Tree</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
