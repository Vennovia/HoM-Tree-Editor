
"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Settings, Folder, RefreshCcw, HardDrive } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SettingsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  importPath: string
  exportPath: string
  onImportPathChange: (path: string) => void
  onExportPathChange: (path: string) => void
  tauriApi: any
}

export function SettingsDialog({ 
  isOpen, 
  onOpenChange, 
  importPath, 
  exportPath, 
  onImportPathChange, 
  onExportPathChange,
  tauriApi 
}: SettingsDialogProps) {
  const { toast } = useToast()

  const handlePickDir = async (type: 'import' | 'export') => {
    if (!tauriApi) return
    
    try {
      const selected = await tauriApi.dialog.open({
        directory: true,
        multiple: false,
        title: `Select ${type === 'import' ? 'Import' : 'Export'} Folder`
      })
      
      if (selected && typeof selected === 'string') {
        if (type === 'import') {
          onImportPathChange(selected)
          localStorage.setItem('hom-config-import-path', selected)
        } else {
          onExportPathChange(selected)
          localStorage.setItem('hom-config-export-path', selected)
        }
        toast({ title: "Path Updated", description: `Synchronized with ${selected}` })
      }
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Selection Failed", description: "Could not access the filesystem." })
    }
  }

  const handleReset = (type: 'import' | 'export') => {
    if (type === 'import') {
      onImportPathChange('')
      localStorage.removeItem('hom-config-import-path')
    } else {
      onExportPathChange('')
      localStorage.removeItem('hom-config-export-path')
    }
    toast({ title: "Reset to Default", description: "Reverted to application install directory." })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline flex items-center gap-2 text-accent">
            <Settings className="w-5 h-5" />
            Grimoire Configuration
          </DialogTitle>
          <DialogDescription>
            Choose where your arcane knowledge is stored. Default paths are located in your editor's installation folder.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
              <HardDrive className="w-3 h-3" /> Import Directory
            </Label>
            <div className="flex gap-2 text-foreground">
              <Input 
                value={importPath || "Using Default (Install Dir /imports)"} 
                readOnly 
                className="bg-background/50 text-xs font-mono h-9" 
              />
              <Button size="sm" variant="outline" onClick={() => handlePickDir('import')}>
                <Folder className="w-4 h-4" />
              </Button>
              {importPath && (
                <Button size="sm" variant="ghost" onClick={() => handleReset('import')}>
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
              <HardDrive className="w-3 h-3" /> Export Directory
            </Label>
            <div className="flex gap-2 text-foreground">
              <Input 
                value={exportPath || "Using Default (Install Dir /exports)"} 
                readOnly 
                className="bg-background/50 text-xs font-mono h-9" 
              />
              <Button size="sm" variant="outline" onClick={() => handlePickDir('export')}>
                <Folder className="w-4 h-4" />
              </Button>
              {exportPath && (
                <Button size="sm" variant="ghost" onClick={() => handleReset('export')}>
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full bg-accent text-accent-foreground font-bold" onClick={() => onOpenChange(false)}>
            Close Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
