"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SpellNode } from '@/types/spell-tree'
import { Sparkles } from 'lucide-react'

interface AddNodeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (nodeDetails: Partial<SpellNode>) => void
}

export function AddNodeDialog({ isOpen, onOpenChange, onConfirm }: AddNodeDialogProps) {
  const [name, setName] = useState('')
  const [formId, setFormId] = useState('')
  const [tier, setTier] = useState(1)
  const [skillLevel, setSkillLevel] = useState('Novice')
  const [theme, setTheme] = useState('_misc')

  const handleConfirm = () => {
    if (!name.trim()) return
    
    onConfirm({
      name: name.trim(),
      formId: formId.trim() || undefined,
      tier,
      skillLevel,
      theme: theme.trim() || "_misc"
    })
    
    onOpenChange(false)
    // Reset state for next time
    setName('')
    setFormId('')
    setTier(1)
    setSkillLevel('Novice')
    setTheme('_misc')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline flex items-center gap-2 text-accent">
            <Sparkles className="w-5 h-5" />
            New Arcane Discovery
          </DialogTitle>
          <DialogDescription>
            Define the base essence of your new spell to manifest it in the tree.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Spell Name</Label>
            <Input
              id="name"
              placeholder="e.g. Chronos Shift"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="formId" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Form ID (Optional)</Label>
            <Input
              id="formId"
              placeholder="e.g. 0x01A2B3C4"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className="bg-background font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tier" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Tier</Label>
              <Input
                id="tier"
                type="number"
                min={1}
                max={10}
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skill" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger id="skill" className="bg-background">
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="theme" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Theme (Glyph)</Label>
            <Input
              id="theme"
              placeholder="_time"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!name.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
          >
            Manifest Spell
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
