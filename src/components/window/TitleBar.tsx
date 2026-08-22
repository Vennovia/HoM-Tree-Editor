"use client"

import React, { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { cn } from '@/lib/utils'
import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined

    getCurrentWindow().isMaximized().then(setIsMaximized).catch(() => {})

    getCurrentWindow().onResized(() => {
      getCurrentWindow().isMaximized().then(setIsMaximized).catch(() => {})
    }).then((fn) => {
      unlisten = fn
    }).catch(() => {})

    return () => {
      if (unlisten) unlisten()
    }
  }, [])

  const handleMinimize = () => {
    getCurrentWindow().minimize().catch(console.error)
  }

  const handleMaximize = async () => {
    try {
      if (isMaximized) {
        await getCurrentWindow().unmaximize()
      } else {
        await getCurrentWindow().maximize()
      }
      setIsMaximized(!isMaximized)
    } catch (e) {
      console.error('Maximize error:', e)
    }
  }

  const handleClose = () => {
    getCurrentWindow().close().catch(console.error)
  }

  return (
    <div className="h-8 bg-primary/20 border-b border-border flex items-center justify-between select-none">
      <div
        data-tauri-drag-region
        className="flex-1 h-full flex items-center px-3"
      >
        <span className="text-xs font-bold text-accent tracking-tight">HoM Tree Editor</span>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full w-10 flex items-center justify-center hover:bg-secondary/80 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full w-10 flex items-center justify-center hover:bg-secondary/80 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Square className="w-3 h-3 text-muted-foreground" />
          ) : (
            <Square className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-full w-10 flex items-center justify-center hover:bg-destructive/80 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  )
}
