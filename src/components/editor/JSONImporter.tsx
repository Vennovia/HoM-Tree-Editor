"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileCode } from 'lucide-react'
import { SpellTreeData } from '@/types/spell-tree'

interface JSONImporterProps {
  onImport: (data: SpellTreeData) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function JSONImporter({ onImport, isOpen, onOpenChange }: JSONImporterProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setJsonInput(content)
      try {
        const parsed = JSON.parse(content)
        // Basic validation
        if (parsed.schools) {
          onImport(parsed as SpellTreeData)
          onOpenChange(false)
        } else {
          setError('Invalid spell tree format: "schools" property missing.')
        }
      } catch (err) {
        setError('Failed to parse JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const handlePasteImport = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      if (parsed.schools) {
        onImport(parsed as SpellTreeData)
        onOpenChange(false)
      } else {
        setError('Invalid spell tree format.')
      }
    } catch (err) {
      setError('Failed to parse JSON string.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline flex items-center gap-2 text-accent">
            <FileCode className="w-6 h-6" />
            Import Spell Tree
          </DialogTitle>
          <DialogDescription>
            Upload a .json file or paste the content below to start editing your spell tree.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">JSON files only</p>
              </div>
              <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or paste content</span>
            </div>
          </div>

          <Textarea 
            placeholder='{ "schools": { ... } }'
            className="min-h-[200px] font-mono text-xs bg-background border-border focus:ring-accent"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            disabled={!jsonInput} 
            onClick={handlePasteImport}
          >
            Load Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
