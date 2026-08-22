"use client"

import React, { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, Copy, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TitleBar() {
  const appWindow = getCurrentWindow()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setup = async () => {
      try {
        const maximized = await appWindow.isMaximized()
        setIsMaximized(maximized)
      } catch {}

      try {
        unlisten = await appWindow.onResized(() => {
          appWindow.isMaximized().then(setIsMaximized).catch(() => {})
        })
      } catch {}
    }

    setup()

    return () => {
      if (unlisten) unlisten()
    }
  }, [appWindow])

  const handleMinimize = () => appWindow.minimize()
  const handleMaximize = async () => {
    if (isMaximized) {
      appWindow.unmaximize()
    } else {
      appWindow.maximize()
    }
  }
  const handleClose = () => appWindow.close()

  return (
    <div 
      className="h-8 bg-card border-b border-border flex items-center justify-between select-none"
      style={{ 
        borderRadius: '12px 12px 0 0',
        borderLeft: '1px solid hsl(var(--border))',
        borderRight: '1px solid hsl(var(--border))',
        borderTop: '1px solid hsl(var(--border))',
      }}
      data-tauri-drag-region
    >
      <div className="flex-1 h-full flex items-center px-4" data-tauri-drag-region>
        <span className="text-xs font-medium text-muted-foreground tracking-wide">
          Heart of Magic Tree Editor
        </span>
      </div>
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full w-12 flex items-center justify-center hover:bg-secondary/50 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full w-12 flex items-center justify-center hover:bg-secondary/50 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Square className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center hover:bg-destructive/80 transition-colors group"
          title="Close"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground group-hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  )
}
