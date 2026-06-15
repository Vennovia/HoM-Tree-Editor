
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { SpellTreeData, SpellNode } from '@/types/spell-tree'
import { JSONImporter } from '@/components/editor/JSONImporter'
import { TreeCanvas } from '@/components/canvas/TreeCanvas'
import { NodeEditor } from '@/components/editor/NodeEditor'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Download, 
  Code, 
  Wand2, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Search,
  LayoutDashboard,
  Target
} from 'lucide-react'
import { cn, deepClone } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function ArcanaFlowStudio() {
  const { toast } = useToast()
  const [treeData, setTreeData] = useState<SpellTreeData | null>(null)
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [nodeSearchQuery, setNodeSearchQuery] = useState('')

  // Load sample data or empty state initially
  useEffect(() => {
    if (!treeData) {
      setIsImportOpen(true)
    }
  }, [treeData])

  const handleImport = (data: SpellTreeData) => {
    setTreeData(data)
    setSelectedSchool(null) 
    toast({
      title: "Knowledge Absorbed",
      description: "Successfully imported arcane data structures."
    })
  }

  const handleExport = () => {
    if (!treeData) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(treeData, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `spell_tree_v${treeData.version}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
    
    toast({
      title: "Grimoire Sealed",
      description: "Successfully exported your changes to a JSON file."
    })
  }

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<SpellNode>) => {
    setTreeData(prev => {
      if (!prev || !selectedSchool) return prev
      
      const school = prev.schools[selectedSchool]
      const nodeIndex = school.nodes.findIndex(n => n.formId === nodeId)
      if (nodeIndex === -1) return prev

      const updatedNodes = [...school.nodes]
      updatedNodes[nodeIndex] = { ...updatedNodes[nodeIndex], ...updates }

      return {
        ...prev,
        schools: {
          ...prev.schools,
          [selectedSchool]: {
            ...school,
            nodes: updatedNodes
          }
        }
      }
    })
  }, [selectedSchool])

  const handleLinkNodes = (sourceId: string, targetId: string) => {
    if (!treeData || !selectedSchool || sourceId === targetId) return
    
    // First check if already linked to decide notification
    const currentSchool = treeData.schools[selectedSchool]
    const sourceNode = currentSchool.nodes.find(n => n.formId === sourceId)
    const isAlreadyLinked = sourceNode?.children.includes(targetId)

    setTreeData(prev => {
      if (!prev) return prev
      const newData = deepClone(prev)
      const school = newData.schools[selectedSchool]
      const sNode = school.nodes.find(n => n.formId === sourceId)
      const tNode = school.nodes.find(n => n.formId === targetId)
      
      if (!sNode || !tNode) return prev

      if (isAlreadyLinked) {
        sNode.children = sNode.children.filter(id => id !== targetId)
        tNode.prerequisites = tNode.prerequisites.filter(id => id !== sourceId)
        tNode.hardPrereqs = tNode.hardPrereqs.filter(id => id !== sourceId)
      } else {
        sNode.children.push(targetId)
        tNode.prerequisites.push(sourceId)
        tNode.hardPrereqs.push(sourceId)
      }
      
      return newData
    })

    // Side effects outside of state update
    toast({
      title: isAlreadyLinked ? "Arcane Severance" : "Bond Established",
      description: isAlreadyLinked ? "Connection dissolved." : "The flow of power is linked."
    })
  }

  const handleDeleteNode = (nodeId: string) => {
    if (!treeData || !selectedSchool) return
    const newData = deepClone(treeData)
    const school = newData.schools[selectedSchool]
    school.nodes = school.nodes.filter(n => n.formId !== nodeId)
    school.nodes.forEach(n => {
      n.children = n.children.filter(id => id !== nodeId)
      n.prerequisites = n.prerequisites.filter(id => id !== nodeId)
      n.hardPrereqs = n.hardPrereqs.filter(id => id !== nodeId)
      n.softPrereqs = n.softPrereqs.filter(id => id !== nodeId)
    })
    setTreeData(newData)
    setSelectedNodeId(null)
    toast({
      variant: "destructive",
      title: "Arcane Fracture",
      description: `Node ${nodeId} has been unmade.`
    })
  }

  const handleAddNode = () => {
    if (!treeData || !selectedSchool) return
    const newData = deepClone(treeData)
    const school = newData.schools[selectedSchool]
    const rootNode = school.nodes.find(n => n.formId === school.root)
    
    const newNode: SpellNode = {
      formId: "0x" + Math.random().toString(16).slice(2, 10).toUpperCase(),
      name: "New Spell Node",
      theme: "_misc",
      tier: 1,
      skillLevel: "Novice",
      x: (rootNode?.x || 0) + 100,
      y: (rootNode?.y || 0) + 100,
      children: [],
      prerequisites: [],
      hardPrereqs: [],
      softPrereqs: [],
      softNeeded: 0
    }
    
    school.nodes.push(newNode)
    setTreeData(newData)
    setSelectedNodeId(newNode.formId)
    toast({
      title: "Magic Manifested",
      description: "New spell node added to the tree."
    })
  }

  const filteredSchools = treeData ? Object.keys(treeData.schools).filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase())
  ) : []

  const selectedNode = treeData && selectedSchool && selectedNodeId 
    ? treeData.schools[selectedSchool].nodes.find(n => n.formId === selectedNodeId) 
    : null

  const nodeSearchResults = treeData && selectedSchool && nodeSearchQuery.length > 1
    ? treeData.schools[selectedSchool].nodes.filter(n => 
        n.name.toLowerCase().includes(nodeSearchQuery.toLowerCase()) || 
        n.formId.toLowerCase().includes(nodeSearchQuery.toLowerCase())
      )
    : []

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body selection:bg-accent/30">
      <Toaster />
      <JSONImporter 
        isOpen={isImportOpen} 
        onOpenChange={setIsImportOpen} 
        onImport={handleImport} 
      />

      <aside className={cn(
        "flex flex-col border-r border-border transition-all duration-300 ease-in-out bg-card/50 backdrop-blur-md relative z-30",
        isSidebarCollapsed ? "w-16" : "w-72"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Wand2 className="w-5 h-5 text-accent" />
              </div>
              <h1 className="font-headline font-bold text-lg tracking-tight">ArcanaFlow</h1>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hover:bg-accent/10 hover:text-accent"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {!isSidebarCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search schools..." 
                  className="pl-9 bg-background border-border h-9 text-xs focus:ring-accent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold px-2">Navigation</Label>
                <div className="space-y-1 mt-2">
                  <button
                    onClick={() => {
                      setSelectedSchool(null)
                      setSelectedNodeId(null)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all group",
                      selectedSchool === null 
                        ? "bg-primary text-accent font-medium arcane-glow" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 opacity-50 group-hover:text-accent" />
                    All Schools
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-bold px-2">Spell Schools</Label>
                <div className="space-y-1 mt-2">
                  {filteredSchools.map(school => (
                    <button
                      key={school}
                      onClick={() => {
                        setSelectedSchool(school)
                        setSelectedNodeId(null)
                        setNodeSearchQuery('')
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all group",
                        selectedSchool === school 
                          ? "bg-primary text-accent font-medium arcane-glow" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 opacity-50 group-hover:text-accent" />
                        {school}
                      </div>
                      <span className="text-[10px] opacity-40">{treeData?.schools[school].nodes.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-border space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 text-xs border-border hover:border-accent hover:text-accent"
                onClick={() => setIsImportOpen(true)}
              >
                <Code className="w-3.5 h-3.5" /> Import JSON
              </Button>
              <Button 
                className="w-full justify-start gap-2 text-xs bg-primary hover:bg-primary/80"
                onClick={handleExport}
                disabled={!treeData}
              >
                <Download className="w-3.5 h-3.5" /> Export Tree
              </Button>
            </div>
          </div>
        )}

        {isSidebarCollapsed && (
          <div className="flex flex-col items-center py-4 gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSchool(null)} title="Dashboard">
              <LayoutDashboard className={cn("w-5 h-5", selectedSchool === null ? "text-accent" : "text-muted-foreground")} />
            </Button>
            <Separator className="bg-border w-8" />
            <Button variant="ghost" size="icon" onClick={() => setIsImportOpen(true)}>
              <Code className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExport} disabled={!treeData}>
              <Download className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Separator className="bg-border w-8" />
            <div className="flex flex-col gap-2">
              {filteredSchools.map(school => (
                <button
                  key={school}
                  onClick={() => {
                    setSelectedSchool(school)
                    setNodeSearchQuery('')
                  }}
                  title={school}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-lg transition-all",
                    selectedSchool === school ? "bg-primary text-accent" : "hover:bg-secondary"
                  )}
                >
                  <span className="text-xs font-bold">{school[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm relative z-20">
          <div className="flex items-center gap-6">
            <h2 className="font-headline font-bold text-muted-foreground">
              {selectedSchool ? <span className="text-accent">{selectedSchool}</span> : <span className="text-accent flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</span>} 
              {selectedNode && <span className="text-muted-foreground/50 mx-2">/</span>}
              {selectedNode && <span className="text-foreground">{selectedNode.name}</span>}
            </h2>

            {selectedSchool && (
              <div className="relative group">
                <Popover open={nodeSearchResults.length > 0}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Find spell..." 
                        className="pl-8 bg-background/50 border-border h-8 w-48 text-xs focus:ring-accent rounded-full"
                        value={nodeSearchQuery}
                        onChange={(e) => setNodeSearchQuery(e.target.value)}
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-64 bg-card border-border shadow-2xl" align="start">
                    <div className="max-h-64 overflow-y-auto">
                      {nodeSearchResults.map(n => (
                        <button
                          key={n.formId}
                          onClick={() => {
                            setSelectedNodeId(n.formId)
                            setNodeSearchQuery('')
                          }}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold">{n.name}</span>
                            <span className="text-[9px] opacity-40 font-mono">{n.formId}</span>
                          </div>
                          <Target className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedSchool && (
              <Button 
                size="sm" 
                className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4"
                onClick={handleAddNode}
              >
                <Plus className="w-4 h-4" /> Add Node
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 relative overflow-auto">
          {treeData ? (
            selectedSchool ? (
              <TreeCanvas 
                schoolName={selectedSchool}
                school={treeData.schools[selectedSchool]}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onNodeMove={handleUpdateNode}
                onLinkNodes={handleLinkNodes}
                searchQuery={nodeSearchQuery}
              />
            ) : (
              <DashboardView 
                data={treeData} 
                onSelectSchool={setSelectedSchool} 
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 text-muted-foreground">
              <div className="p-8 rounded-full bg-secondary/20 animate-pulse border border-dashed border-border">
                <Wand2 className="w-16 h-16 opacity-20" />
              </div>
              <p className="font-headline text-lg">Knowledge remains unrecorded.</p>
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>Import Spell Tree</Button>
            </div>
          )}
        </div>
      </main>

      <aside className={cn(
        "border-l border-border bg-card/80 backdrop-blur-md transition-all duration-300 ease-in-out relative z-30",
        selectedNodeId ? "w-96" : "w-0 overflow-hidden border-l-0"
      )}>
        {selectedNode && selectedSchool && (
          <NodeEditor 
            schoolName={selectedSchool}
            school={treeData!.schools[selectedSchool]}
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
          />
        )}
      </aside>
    </div>
  )
}
