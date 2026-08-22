"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, FileCode, FileSearch } from 'lucide-react'
import { SpellTreeData } from '@/types/spell-tree'
import { cn } from '@/lib/utils'

interface JSONImporterProps {
  onImport: (data: SpellTreeData) => void
  onBuilderImport?: (data: any, rules?: any) => void
  onBuilderScanParsed?: (data: any) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function FileDropZone({
  title,
  expectedFileName,
  icon,
  onFile,
  onError,
}: {
  title: string
  expectedFileName: string
  icon: React.ReactNode
  onFile: (file: File) => void
  onError: (msg: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const name = file.name.toLowerCase()
    const expected = expectedFileName.toLowerCase()

    if (!name.endsWith('.json')) {
      onError('File must be a JSON file.')
      return
    }

    const baseExpected = expected.replace('.json', '')
    if (name !== expected && !name.startsWith(baseExpected)) {
      onError(`Expected file starting with "${baseExpected}".`)
      return
    }
    onFile(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">{title}</Label>
      <label
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 transition-colors",
          isDragging ? "border-accent bg-accent/10" : "border-border hover:bg-secondary"
        )}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isDragging) setIsDragging(true)
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isDragging) setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
        }}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className={cn("w-8 h-8 mb-3", isDragging ? "text-accent" : "text-muted-foreground")} />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">Requires {expectedFileName}</p>
        </div>
        <input type="file" className="hidden" accept=".json" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
    </div>
  )
}

export function JSONImporter({ onImport, onBuilderImport, onBuilderScanParsed, isOpen, onOpenChange }: JSONImporterProps) {
  const [error, setError] = useState<string | null>(null)

  const readSpellTree = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      try {
        const parsed = JSON.parse(content)
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

  const readBuilderScan = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      try {
        const parsed = JSON.parse(content)
        if (onBuilderScanParsed) {
          onBuilderScanParsed(parsed)
        } else if (onBuilderImport) {
          onBuilderImport(parsed)
        }
        onOpenChange(false)
      } catch (err) {
        setError('Failed to parse JSON file.')
      }
    }
    reader.readAsText(file)
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
            Drop or select a JSON file below to start editing your spell tree or build from a scan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <FileDropZone
            title="Spell Tree"
            expectedFileName="spell_tree.json"
            icon={<FileCode className="w-8 h-8" />}
            onFile={readSpellTree}
            onError={setError}
          />

          <FileDropZone
            title="Tree Builder"
            expectedFileName="spell_scan_output.json"
            icon={<FileSearch className="w-8 h-8" />}
            onFile={readBuilderScan}
            onError={setError}
          />

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
