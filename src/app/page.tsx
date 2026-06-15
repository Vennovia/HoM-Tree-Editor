
"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { SpellTreeData, SpellNode } from '@/types/spell-tree'
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
  Globe
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
  const [selectedSchool, setSelectedSchool] = useState<string | 'all' | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [nodeSearchQuery, setNodeSearchQuery] = useState('')

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

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<SpellNode>) => {
    const schoolName = findSchoolForNode(nodeId)
    if (!schoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      const newData = deepClone(prev)
      const school = newData.schools[schoolName]
      const nodeIndex = school.nodes.findIndex(n => n.formId === nodeId)
      if (nodeIndex === -1) return prev
      school.nodes[nodeIndex] = { ...school.nodes[nodeIndex], ...updates }
      return newData
    })
  }, [findSchoolForNode])

  const handleLinkNodes = (sourceId: string, targetId: string) => {
    const sourceSchool = findSchoolForNode(sourceId)
    const targetSchool = findSchoolForNode(targetId)

    if (!sourceSchool || !targetSchool || sourceSchool !== targetSchool || sourceId === targetId) {
      if (sourceSchool !== targetSchool) {
        toast({
          variant: "destructive",
          title: "Arcane Dissonance",
          description: "Cannot link spells between different schools."
        })
      }
      return
    }

    setTreeData(prev => {
      const newData = deepClone(prev!)
      const school = newData.schools[sourceSchool]
      const sNode = school.nodes.find(n => n.formId === sourceId)
      const tNode = school.nodes.find(n => n.formId === targetId)
      
      if (!sNode || !tNode) return prev

      const isAlreadyLinked = sNode.children.includes(targetId)
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
  }

  const handleDeleteNode = (nodeId: string) => {
    const schoolName = findSchoolForNode(nodeId)
    if (!schoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      const newData = deepClone(prev)
      const school = newData.schools[schoolName]
      school.nodes = school.nodes.filter(n => n.formId !== nodeId)
      
      Object.values(newData.schools).forEach(s => {
        s.nodes.forEach(n => {
          n.children = n.children.filter(id => id !== nodeId)
          n.prerequisites = n.prerequisites.filter(id => id !== nodeId)
          n.hardPrereqs = n.hardPrereqs.filter(id => id !== nodeId)
        })
      })
      
      return newData
    })
    setSelectedNodeId(null)
  }

  const handleAddNode = () => {
    if (!treeData || !selectedSchool || selectedSchool === 'all') return

    setTreeData(prev => {
      if (!prev) return prev
      const newData = deepClone(prev)
      const school = newData.schools[selectedSchool]
      const rootNode = school.nodes.find(n => n.formId === school.root)
      
      const newNodeId = "0x" + Math.random().toString(16).slice(2, 10).toUpperCase()
      const newNode: SpellNode = {
        formId: newNodeId,
        name: "New Spell",
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
      setSelectedNodeId(newNodeId)
      return newData
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
    
    const schoolsToSearch = selectedSchool === 'all' || selectedSchool === null 
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
              <h1 className="font-bold text-lg">ArcanaFlow</h1>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
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
                  onClick={() => { setSelectedSchool(null); setSelectedNodeId(null); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all", selectedSchool === null ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button
                  onClick={() => { setSelectedSchool('all'); setSelectedNodeId(null); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all", selectedSchool === 'all' ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}
                >
                  <Globe className="w-3.5 h-3.5" /> View All (Hub)
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest px-2">Schools</Label>
                <div className="space-y-1 mt-2">
                  {filteredSchools.map(school => (
                    <button
                      key={school}
                      onClick={() => { setSelectedSchool(school); setSelectedNodeId(null); }}
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

      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm relative z-20">
          <div className="flex items-center gap-6">
            <h2 className="font-bold">
              {selectedSchool === 'all' ? "Arch-Grimoire Hub" : selectedSchool || "Dashboard"}
            </h2>

            {selectedSchool && (
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
            )}
          </div>
          {selectedSchool && selectedSchool !== 'all' && (
            <Button size="sm" onClick={handleAddNode}>
              <Plus className="w-4 h-4" /> Add Spell
            </Button>
          )}
        </header>

        <div className="flex-1 relative">
          {treeData ? (
            selectedSchool === 'all' ? (
              <GlobalGrimoireView 
                schools={treeData.schools}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                searchQuery={nodeSearchQuery}
              />
            ) : selectedSchool ? (
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
            onDelete={handleDeleteNode}
          />
        </aside>
      )}
    </div>
  )
}
