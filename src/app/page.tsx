
"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { SpellTreeData, SpellNode, SpellSchool } from '@/types/spell-tree'
import { JSONImporter } from '@/components/editor/JSONImporter'
import { TreeCanvas } from '@/components/canvas/TreeCanvas'
import { GlobalGrimoireView } from '@/components/canvas/GlobalGrimoireView'
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
  Target,
  Globe,
  Compass,
  Undo2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const STORAGE_KEY = 'hom-tree-editor-data'
const MAX_HISTORY = 20

export default function HoMTreeEditor() {
  const { toast } = useToast()
  const [treeData, setTreeData] = useState<SpellTreeData | null>(null)
  const [history, setHistory] = useState<SpellTreeData[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isGlobalView, setIsGlobalView] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [nodeSearchQuery, setNodeSearchQuery] = useState('')
  const [showRadialGuides, setShowRadialGuides] = useState(false)

  // Robust migration function to handle multiple root sources
  const migrateGrimoireData = useCallback((data: any) => {
    if (!data.schools) return data;
    
    Object.values(data.schools).forEach((school: any) => {
      const rootsSet = new Set<string>();
      
      // 1. Check legacy single root field
      if (school.root) rootsSet.add(school.root);
      
      // 2. Check current roots array
      if (Array.isArray(school.roots)) {
        school.roots.forEach((id: string) => rootsSet.add(id));
      }
      
      // 3. Check node-level isRoot flags
      if (Array.isArray(school.nodes)) {
        school.nodes.forEach((node: any) => {
          if (node.isRoot) rootsSet.add(node.formId);
        });
      }
      
      school.roots = Array.from(rootsSet);
    });
    
    return data;
  }, []);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const migrated = migrateGrimoireData(parsed)
        setTreeData(migrated)
        setIsImportOpen(false)
      } catch (e) {
        console.error("Failed to parse saved grimoire", e)
        setIsImportOpen(true)
      }
    } else {
      setIsImportOpen(true)
    }
  }, [migrateGrimoireData])

  // Save to LocalStorage whenever treeData changes
  useEffect(() => {
    if (treeData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData))
    }
  }, [treeData])

  const pushHistory = useCallback((state: SpellTreeData) => {
    setHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(state))]
      if (newHistory.length > MAX_HISTORY) return newHistory.slice(1)
      return newHistory
    })
  }, [])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const prevStates = [...history]
    const lastState = prevStates.pop()
    if (lastState) {
      setTreeData(lastState)
      setHistory(prevStates)
      toast({
        title: "Arcane Rewind",
        description: "Reverted to previous state."
      })
    }
  }, [history, toast])

  // Keyboard shortcut for Undo (Ctrl+Z or Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo])

  const handleImport = (data: SpellTreeData) => {
    const migrated = migrateGrimoireData(data)
    setTreeData(migrated)
    setHistory([]) // Clear history on fresh import
    setSelectedSchool(null) 
    setIsGlobalView(false)
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
      description: "Successfully exported your grimoire."
    })
  }

  const findSchoolForNode = useCallback((nodeId: string): string | null => {
    if (!treeData) return null
    for (const schoolName in treeData.schools) {
      if (treeData.schools[schoolName].nodes.some(n => n.formId === nodeId)) {
        return schoolName
      }
    }
    return null
  }, [treeData])

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<SpellNode>, providedSchoolName?: string) => {
    const schoolName = providedSchoolName || findSchoolForNode(nodeId)
    if (!schoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev)
      const school = prev.schools[schoolName]
      const nodeIndex = school.nodes.findIndex(n => n.formId === nodeId)
      if (nodeIndex === -1) return prev
      
      const newNodes = [...school.nodes]
      newNodes[nodeIndex] = { ...newNodes[nodeIndex], ...updates }
      
      return {
        ...prev,
        schools: {
          ...prev.schools,
          [schoolName]: {
            ...school,
            nodes: newNodes
          }
        }
      }
    })
  }, [findSchoolForNode, pushHistory])

  const handleUpdateSchool = useCallback((schoolName: string, updates: Partial<SpellSchool>) => {
    setTreeData(prev => {
      if (!prev || !prev.schools[schoolName]) return prev
      pushHistory(prev)
      return {
        ...prev,
        schools: {
          ...prev.schools,
          [schoolName]: {
            ...prev.schools[schoolName],
            ...updates
          }
        }
      }
    })
  }, [pushHistory])

  const handleToggleRelationship = useCallback((nodeId: string, targetId: string, type: 'hard' | 'soft' | 'child' | 'pool') => {
    const schoolName = findSchoolForNode(nodeId)
    if (!schoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev)
      
      const school = prev.schools[schoolName]
      const nodes = [...school.nodes]
      
      const nodeIdx = nodes.findIndex(n => n.formId === nodeId)
      const targetIdx = nodes.findIndex(n => n.formId === targetId)
      
      if (nodeIdx === -1 || targetIdx === -1) return prev

      const node = { ...nodes[nodeIdx] }
      const target = { ...nodes[targetIdx] }

      // Helper to ensure 'prerequisites' and 'children' pool sync
      const ensurePoolLink = (n: SpellNode, t: SpellNode) => {
        if (!(n.prerequisites || []).includes(t.formId)) n.prerequisites = [...(n.prerequisites || []), t.formId]
        if (!(t.children || []).includes(n.formId)) t.children = [...(t.children || []), n.formId]
      }

      if (type === 'pool') {
        ensurePoolLink(node, target)
      } else if (type === 'hard') {
        const exists = (node.hardPrereqs || []).includes(targetId)
        if (exists) {
          node.hardPrereqs = (node.hardPrereqs || []).filter(id => id !== targetId)
        } else {
          node.hardPrereqs = [...(node.hardPrereqs || []), targetId]
          node.softPrereqs = (node.softPrereqs || []).filter(id => id !== targetId) // Mutually exclusive
          ensurePoolLink(node, target)
        }
      } else if (type === 'soft') {
        const exists = (node.softPrereqs || []).includes(targetId)
        if (exists) {
          node.softPrereqs = (node.softPrereqs || []).filter(id => id !== targetId)
        } else {
          node.softPrereqs = [...(node.softPrereqs || []), targetId]
          node.hardPrereqs = (node.hardPrereqs || []).filter(id => id !== targetId) // Mutually exclusive
          ensurePoolLink(node, target)
        }
      } else if (type === 'child') {
        const exists = (node.children || []).includes(targetId)
        if (exists) {
          node.children = (node.children || []).filter(id => id !== targetId)
          target.prerequisites = (target.prerequisites || []).filter(id => id !== nodeId)
          target.hardPrereqs = (target.hardPrereqs || []).filter(id => id !== nodeId)
          target.softPrereqs = (target.softPrereqs || []).filter(id => id !== nodeId)
        } else {
          node.children = [...(node.children || []), targetId]
          if (!(target.prerequisites || []).includes(nodeId)) target.prerequisites = [...(target.prerequisites || []), nodeId]
        }
      }

      nodes[nodeIdx] = node
      nodes[targetIdx] = target

      return {
        ...prev,
        schools: {
          ...prev.schools,
          [schoolName]: {
            ...school,
            nodes
          }
        }
      }
    })
  }, [findSchoolForNode, pushHistory])

  const handleLinkNodes = (sourceId: string, targetId: string) => {
    handleToggleRelationship(targetId, sourceId, 'pool')
  }

  const handleDeleteNode = (nodeId: string) => {
    const schoolName = findSchoolForNode(nodeId)
    if (!schoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev)
      
      const newSchools = { ...prev.schools }
      
      newSchools[schoolName] = {
        ...newSchools[schoolName],
        roots: (newSchools[schoolName].roots || []).filter(id => id !== nodeId),
        nodes: newSchools[schoolName].nodes.filter(n => n.formId !== nodeId)
      }
      
      Object.keys(newSchools).forEach(sName => {
        newSchools[sName] = {
          ...newSchools[sName],
          nodes: newSchools[sName].nodes.map(n => ({
            ...n,
            children: (n.children || []).filter(id => id !== nodeId),
            prerequisites: (n.prerequisites || []).filter(id => id !== nodeId),
            hardPrereqs: (n.hardPrereqs || []).filter(id => id !== nodeId),
            softPrereqs: (n.softPrereqs || []).filter(id => id !== nodeId)
          }))
        }
      })
      
      return {
        ...prev,
        schools: newSchools
      }
    })
    setSelectedNodeId(null)
  }

  const handleAddNode = () => {
    if (!treeData || !selectedSchool) return

    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev)
      const school = prev.schools[selectedSchool]
      const firstRoot = school.roots?.[0]
      const referenceNode = school.nodes.find(n => n.formId === firstRoot) || school.nodes[0]
      
      const newNodeId = "0x" + Math.random().toString(16).slice(2, 10).toUpperCase()
      const newNode: SpellNode = {
        formId: newNodeId,
        name: "New Spell",
        theme: "_misc",
        tier: 1,
        skillLevel: "Novice",
        x: (referenceNode?.x || 0) + 100,
        y: (referenceNode?.y || 0) + 100,
        children: [],
        prerequisites: [],
        hardPrereqs: [],
        softPrereqs: [],
        softNeeded: 0
      }
      
      return {
        ...prev,
        schools: {
          ...prev.schools,
          [selectedSchool]: {
            ...school,
            nodes: [...school.nodes, newNode]
          }
        }
      }
    })
  }

  const filteredSchools = treeData ? Object.keys(treeData.schools).filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase())
  ) : []

  const selectedNode = useMemo(() => {
    if (!treeData || !selectedNodeId) return null
    for (const sName in treeData.schools) {
      const node = treeData.schools[sName].nodes.find(n => n.formId === selectedNodeId)
      if (node) return { node, schoolName: sName }
    }
    return null
  }, [treeData, selectedNodeId])

  const nodeSearchResults = useMemo(() => {
    if (!treeData || nodeSearchQuery.length < 2) return []
    const results: SpellNode[] = []
    
    const schoolsToSearch = selectedSchool === null 
      ? Object.values(treeData.schools) 
      : [treeData.schools[selectedSchool]]

    schoolsToSearch.forEach(school => {
      school.nodes.forEach(node => {
        if (node.name.toLowerCase().includes(nodeSearchQuery.toLowerCase()) || 
            node.formId.toLowerCase().includes(nodeSearchQuery.toLowerCase())) {
          results.push(node)
        }
      })
    })
    return results.slice(0, 10)
  }, [treeData, selectedSchool, nodeSearchQuery])

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Toaster />
      <JSONImporter 
        isOpen={isImportOpen} 
        onOpenChange={setIsImportOpen} 
        onImport={handleImport} 
      />

      <aside className={cn(
        "flex flex-col border-r border-border transition-all bg-card/50 backdrop-blur-md relative z-30",
        isSidebarCollapsed ? "w-16" : "w-72"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              <h1 className="font-bold text-lg">HoM tree editor</h1>
            </div>
          )}
          <button 
            className="p-2 hover:bg-secondary rounded-md transition-colors" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter schools..." 
                  className="pl-9 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedSchool(null); setSelectedNodeId(null); setIsGlobalView(false); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all", (!selectedSchool && !isGlobalView) ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button
                  onClick={() => { setSelectedSchool(null); setSelectedNodeId(null); setIsGlobalView(true); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all", isGlobalView ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}
                >
                  <Globe className="w-3.5 h-3.5" /> Arch-Grimoire Hub
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest px-2">Schools</Label>
                <div className="space-y-1 mt-2">
                  {filteredSchools.map(school => (
                    <button
                      key={school}
                      onClick={() => { setSelectedSchool(school); setSelectedNodeId(null); setIsGlobalView(false); }}
                      className={cn("w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all", selectedSchool === school ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> {school}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-border space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 text-xs" 
                onClick={handleUndo} 
                disabled={history.length === 0}
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo Action
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" onClick={() => setIsImportOpen(true)}>
                <Code className="w-3.5 h-3.5" /> Import
              </Button>
              <Button className="w-full justify-start gap-2 text-xs" onClick={handleExport} disabled={!treeData}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-0 bg-background relative overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm relative z-20">
          <div className="flex items-center gap-6">
            <h2 className="font-bold">
              {selectedSchool || (isGlobalView ? "Arch-Grimoire Hub" : "Dashboard")}
            </h2>

            {(selectedSchool || isGlobalView) && (
              <>
                <Popover open={nodeSearchResults.length > 0}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search spell..." 
                        className="pl-8 h-8 w-48 text-xs rounded-full"
                        value={nodeSearchQuery}
                        onChange={(e) => setNodeSearchQuery(e.target.value)}
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-64" align="start">
                    <div className="max-h-64 overflow-y-auto">
                      {nodeSearchResults.map(n => (
                        <button
                          key={n.formId}
                          onClick={() => { setSelectedNodeId(n.formId); setNodeSearchQuery(''); }}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-accent/10 border-b border-border"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold">{n.name}</span>
                            <span className="text-[9px] opacity-40">{n.formId}</span>
                          </div>
                          <Target className="w-3 h-3 text-accent" />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("gap-2 text-xs", showRadialGuides ? "text-accent bg-accent/10" : "text-muted-foreground")}
                  onClick={() => setShowRadialGuides(!showRadialGuides)}
                >
                  <Compass className="w-4 h-4" /> {showRadialGuides ? "Radial On" : "Radial Off"}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedSchool && (
              <Button size="sm" onClick={handleAddNode}>
                <Plus className="w-4 h-4" /> Add Spell
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 relative">
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
                showRadialGuides={showRadialGuides}
              />
            ) : isGlobalView ? (
              <GlobalGrimoireView 
                schools={treeData.schools}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onNodeMove={handleUpdateNode}
                onLinkNodes={handleLinkNodes}
                searchQuery={nodeSearchQuery}
                showRadialGuides={showRadialGuides}
              />
            ) : (
              <DashboardView data={treeData} onSelectSchool={setSelectedSchool} />
            )
          ) : null}
        </div>
      </main>

      {selectedNode && (
        <aside className="w-96 border-l border-border bg-card/80 backdrop-blur-md relative z-30">
          <NodeEditor 
            schoolName={selectedNode.schoolName}
            school={treeData!.schools[selectedNode.schoolName]}
            node={selectedNode.node}
            onUpdate={handleUpdateNode}
            onUpdateSchool={handleUpdateSchool}
            onToggleRelationship={handleToggleRelationship}
            onDelete={handleDeleteNode}
            onSelectNode={setSelectedNodeId}
          />
        </aside>
      )}
    </div>
  )
}
