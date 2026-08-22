
"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { SpellTreeData, SpellNode, SpellSchool } from '@/types/spell-tree'
import { JSONImporter } from '@/components/editor/JSONImporter'
import { TreeCanvas } from '@/components/canvas/TreeCanvas'
import { GlobalGrimoireView } from '@/components/canvas/GlobalGrimoireView'
import { NodeEditor } from '@/components/editor/NodeEditor'
import { AddNodeDialog } from '@/components/editor/AddNodeDialog'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { TitleBar } from '@/components/window/TitleBar'
import { buildTreeFromScan, relayoutTree, rebuildTree } from '@/lib/treeBuilder'
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
  Undo2,
  MousePointer2,
  Command,
  SquareDashedMousePointer,
  Link,
  Move,
  CheckSquare,
  RefreshCw,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

interface HistoryEntry {
  description: string
  state: SpellTreeData
  timestamp: number
}

const STORAGE_KEY = 'hom-tree-editor-data'
const SETTINGS_KEY = 'hom-tree-editor-settings'
const MAX_HISTORY = 20

export default function HoMTreeEditor() {
  const { toast } = useToast()
  const [treeData, setTreeData] = useState<SpellTreeData | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false)
  const [isGlobalView, setIsGlobalView] = useState(false)
  const [nodeSearchQuery, setNodeSearchQuery] = useState('')
  const [sidebarSpellQuery, setSidebarSpellQuery] = useState('')
  const [showRadialGuides, setShowRadialGuides] = useState(false)
  const [randomizeTree, setRandomizeTree] = useState(false)
  
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  const migrateGrimoireData = useCallback((data: any) => {
    if (!data.schools) return data;
    Object.values(data.schools).forEach((school: any) => {
      const rootsSet = new Set<string>();
      if (school.root) rootsSet.add(school.root);
      if (Array.isArray(school.roots)) {
        school.roots.forEach((id: string) => rootsSet.add(id));
      }
      if (Array.isArray(school.nodes)) {
        school.nodes.forEach((node: any) => {
          if (node.isRoot) rootsSet.add(node.formId);
        });
      }
      school.roots = Array.from(rootsSet);
      // Ensure node isRoot flags match the roots list
      if (Array.isArray(school.nodes)) {
        school.nodes.forEach((node: any) => {
          node.isRoot = school.roots.includes(node.formId);
        });
      }
    });
    return data;
  }, []);

  // Load Tree Data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const migrated = migrateGrimoireData(parsed)
        setTreeData(migrated)
        setIsImportOpen(false)
      } catch (e) {
        setIsImportOpen(true)
      }
    } else {
      setIsImportOpen(true)
    }
  }, [migrateGrimoireData])

  // Load Settings
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY)
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        if (settings.showRadialGuides !== undefined) setShowRadialGuides(settings.showRadialGuides)
      } catch (e) {}
    }
  }, [])

  // Save Tree Data
  useEffect(() => {
    if (treeData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData))
    }
  }, [treeData])

  // Save Settings
  useEffect(() => {
    const settings = {
      showRadialGuides
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [showRadialGuides])

  const pushHistory = useCallback((state: SpellTreeData, description: string) => {
    setHistory(prev => {
      const newHistory = [...prev, { description, state: JSON.parse(JSON.stringify(state)), timestamp: Date.now() }]
      if (newHistory.length > MAX_HISTORY) return newHistory.slice(1)
      return newHistory
    })
  }, [])

  const undoTo = useCallback((targetIndex?: number) => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const newHistory = [...prev]
      const idx = targetIndex !== undefined ? targetIndex : newHistory.length - 1
      const entry = newHistory[idx]
      if (!entry) return prev
      setTreeData(entry.state)
      newHistory.splice(idx, 1)
      return newHistory
    })
    toast({ title: "Arcane Rewind", description: targetIndex !== undefined ? "Reverted to selected action." : "Reverted to previous state." })
  }, [toast])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undoTo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoTo])

  const handleImport = (data: SpellTreeData) => {
    const migrated = migrateGrimoireData(data)
    const normalized = relayoutTree(migrated)
    setTreeData(normalized)
    setHistory([])
    setSelectedSchool(null) 
    setIsGlobalView(false)
    toast({ title: "Knowledge Absorbed", description: "Successfully imported arcane data structures." })
  }

  const handleExport = () => {
    if (!treeData) return
    const jsonString = JSON.stringify(treeData, null, 2);
    const fileName = `spell_tree_${Date.now()}.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Grimoire Exported", description: "Saved to your system Downloads folder." })
  }

  const findSchoolForNode = useCallback((nodeId: string): string | null => {
    if (!treeData) return null
    for (const schoolName in treeData.schools) {
      if (treeData.schools[schoolName].nodes.some(n => n.formId === nodeId)) return schoolName
    }
    return null
  }, [treeData])

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<SpellNode>, providedSchoolName?: string) => {
    const schoolName = providedSchoolName || findSchoolForNode(nodeId)
    if (!schoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev, `Updated node: ${nodeId}`)
      
      const oldId = nodeId
      const newId = updates.formId
      let newSchools = { ...prev.schools }

      if (newId && newId !== oldId) {
        Object.keys(newSchools).forEach(sName => {
          const school = newSchools[sName]
          const newRoots = (school.roots || []).map(id => id === oldId ? newId : id)
          const newNodes = school.nodes.map(n => {
            const isTargetNode = n.formId === oldId
            const replaceId = (arr: string[] = []) => arr.map(id => id === oldId ? newId : id)
            return {
              ...n,
              formId: isTargetNode ? newId : n.formId,
              ...(isTargetNode ? updates : {}),
              children: replaceId(n.children),
              prerequisites: replaceId(n.prerequisites),
              hardPrereqs: replaceId(n.hardPrereqs),
              softPrereqs: replaceId(n.softPrereqs)
            }
          })
          newSchools[sName] = { ...school, roots: newRoots, nodes: newNodes }
        })
        setSelectedNodeIds(prevIds => prevIds.map(id => id === oldId ? newId! : id));
        setHighlightedNodeIds([]);
      } else {
        const school = newSchools[schoolName]
        const nodeIndex = school.nodes.findIndex(n => n.formId === nodeId)
        if (nodeIndex !== -1) {
          const newNodes = [...school.nodes]
          const updatedNode = { ...newNodes[nodeIndex], ...updates }
          newNodes[nodeIndex] = updatedNode
          
          const newRoots = newNodes.filter(n => n.isRoot).map(n => n.formId).slice(0, 3);
          newSchools[schoolName] = { ...school, nodes: newNodes, roots: newRoots }
        }
      }
      const result = { ...prev, schools: newSchools }
      if (updates.tier !== undefined) {
        return relayoutTree(result)
      }
      return result
    })
  }, [findSchoolForNode, pushHistory])

  const handleUpdateNodes = useCallback((updates: Record<string, Partial<SpellNode>>) => {
    setTreeData(prev => {
      if (!prev) return prev;

      const nodeIds = Object.keys(updates)
      const isPositionOnly = nodeIds.every(id => Object.keys(updates[id]).length === 2 && 'x' in updates[id] && 'y' in updates[id])
      const hasTierChange = Object.values(updates).some(u => u.tier !== undefined)
      const hasRootChange = Object.values(updates).some(u => u.isRoot !== undefined)

      let description = ''
      if (isPositionOnly) {
        const names = nodeIds.slice(0, 3).map(id => {
          for (const sName in prev.schools) {
            const node = prev.schools[sName].nodes.find(n => n.formId === id)
            if (node) return node.name
          }
          return id
        })
        description = nodeIds.length <= 3
          ? `Moved: ${names.join(', ')}`
          : `Moved ${nodeIds.length} nodes`
      } else if (hasTierChange) {
        description = `Changed tier for ${nodeIds.length} nodes`
      } else if (hasRootChange) {
        description = `Changed root status for ${nodeIds.length} nodes`
      } else {
        description = `Updated ${nodeIds.length} nodes`
      }

      pushHistory(prev, description)
      const newSchools = { ...prev.schools };
      
      Object.entries(updates).forEach(([nodeId, nodeUpdates]) => {
        const schoolName = findSchoolForNode(nodeId);
        if (!schoolName) return;
        const school = newSchools[schoolName];
        const nodeIndex = school.nodes.findIndex(n => n.formId === nodeId);
        if (nodeIndex !== -1) {
          const newNodes = [...school.nodes];
          newNodes[nodeIndex] = { ...newNodes[nodeIndex], ...nodeUpdates };
          school.nodes = newNodes;
          
          if (nodeUpdates.isRoot !== undefined) {
            school.roots = newNodes.filter(n => n.isRoot).map(n => n.formId).slice(0, 3);
          }
        }
      });
      const result = { ...prev, schools: newSchools };
      if (hasTierChange) {
        return relayoutTree(result)
      }
      return result;
    });
  }, [findSchoolForNode, pushHistory]);

  const handleUpdateSchool = useCallback((schoolName: string, updates: Partial<SpellSchool>) => {
    setTreeData(prev => {
      if (!prev || !prev.schools[schoolName]) return prev
      pushHistory(prev, `Updated school: ${schoolName}`)
      
      const updatedSchool = { ...prev.schools[schoolName], ...updates };
      
      // If roots list was updated, sync isRoot flag on nodes
      if (updates.roots) {
        updatedSchool.nodes = updatedSchool.nodes.map(node => ({
          ...node,
          isRoot: updates.roots!.includes(node.formId)
        }));
      }
      
      return { ...prev, schools: { ...prev.schools, [schoolName]: updatedSchool } }
    })
  }, [pushHistory])

  const handleToggleRelationship = useCallback((nodeId: string, targetId: string, type: 'hard' | 'soft' | 'child' | 'pool') => {
    const sourceSchoolName = findSchoolForNode(nodeId)
    const targetSchoolName = findSchoolForNode(targetId)
    if (!sourceSchoolName || !targetSchoolName) return

    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev, `Toggled ${nodeId} ↔ ${targetId}`)
      const newSchools = { ...prev.schools }
      
      const sourceSchool = { ...newSchools[sourceSchoolName] }
      const targetSchool = sourceSchoolName === targetSchoolName ? sourceSchool : { ...newSchools[targetSchoolName] }
      
      const sourceNodes = [...sourceSchool.nodes]
      const targetNodes = sourceSchoolName === targetSchoolName ? sourceNodes : [...targetSchool.nodes]
      
      const sourceIdx = sourceNodes.findIndex(n => n.formId === nodeId)
      const targetIdx = targetNodes.findIndex(n => n.formId === targetId)
      
      if (sourceIdx === -1 || targetIdx === -1) return prev
      
      const sourceNode = { ...sourceNodes[sourceIdx] }
      const targetNode = { ...targetNodes[targetIdx] }

      const ensurePoolLink = (s: SpellNode, t: SpellNode) => {
        if (!(s.prerequisites || []).includes(t.formId)) s.prerequisites = [...(s.prerequisites || []), t.formId]
        if (!(t.children || []).includes(s.formId)) t.children = [...(t.children || []), s.formId]
      }

      if (type === 'pool') {
        const isPrereq = (sourceNode.prerequisites || []).includes(targetId);
        if (isPrereq) {
          // Remove link
          sourceNode.prerequisites = (sourceNode.prerequisites || []).filter(id => id !== targetId);
          sourceNode.hardPrereqs = (sourceNode.hardPrereqs || []).filter(id => id !== targetId);
          sourceNode.softPrereqs = (sourceNode.softPrereqs || []).filter(id => id !== targetId);
          targetNode.children = (targetNode.children || []).filter(id => id !== nodeId);
        } else {
          // Add link - DEFAULT TO SOFT PREREQ
          ensurePoolLink(sourceNode, targetNode);
          if (!(sourceNode.softPrereqs || []).includes(targetId)) {
            sourceNode.softPrereqs = [...(sourceNode.softPrereqs || []), targetId];
          }
        }
      } else if (type === 'hard') {
        const exists = (sourceNode.hardPrereqs || []).includes(targetId)
        if (exists) sourceNode.hardPrereqs = (sourceNode.hardPrereqs || []).filter(id => id !== targetId)
        else {
          sourceNode.hardPrereqs = [...(sourceNode.hardPrereqs || []), targetId]
          sourceNode.softPrereqs = (sourceNode.softPrereqs || []).filter(id => id !== targetId)
          ensurePoolLink(sourceNode, targetNode)
        }
      } else if (type === 'soft') {
        const exists = (sourceNode.softPrereqs || []).includes(targetId)
        if (exists) sourceNode.softPrereqs = (sourceNode.softPrereqs || []).filter(id => id !== targetId)
        else {
          sourceNode.softPrereqs = [...(sourceNode.softPrereqs || []), targetId]
          sourceNode.hardPrereqs = (sourceNode.hardPrereqs || []).filter(id => id !== targetId)
          ensurePoolLink(sourceNode, targetNode)
        }
      } else if (type === 'child') {
        const exists = (sourceNode.children || []).includes(targetId)
        if (exists) {
          sourceNode.children = (sourceNode.children || []).filter(id => id !== targetId)
          targetNode.prerequisites = (targetNode.prerequisites || []).filter(id => id !== nodeId)
          targetNode.hardPrereqs = (targetNode.hardPrereqs || []).filter(id => id !== nodeId)
          targetNode.softPrereqs = (targetNode.softPrereqs || []).filter(id => id !== nodeId)
        } else {
          sourceNode.children = [...(sourceNode.children || []), targetId]
          if (!(targetNode.prerequisites || []).includes(nodeId)) targetNode.prerequisites = [...(targetNode.prerequisites || []), nodeId]
          // Default child link to be soft on the target
          if (!(targetNode.softPrereqs || []).includes(nodeId)) targetNode.softPrereqs = [...(targetNode.softPrereqs || []), nodeId]
        }
      }

      sourceNodes[sourceIdx] = sourceNode
      targetNodes[targetIdx] = targetNode

      newSchools[sourceSchoolName] = { ...sourceSchool, nodes: sourceNodes }
      if (sourceSchoolName !== targetSchoolName) {
        newSchools[targetSchoolName] = { ...targetSchool, nodes: targetNodes }
      }

      return { ...prev, schools: newSchools }
    })
  }, [findSchoolForNode, pushHistory])

  const handleLinkNodes = (sourceId: string, targetId: string) => handleToggleRelationship(targetId, sourceId, 'pool')

  const handleDeleteNode = useCallback((nodeId: string) => {
    const schoolName = findSchoolForNode(nodeId)
    if (!schoolName) return
    setTreeData(prev => {
      if (!prev) return prev
      pushHistory(prev, `Deleted node: ${nodeId}`)
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
      return relayoutTree({ ...prev, schools: newSchools })
    })
    setSelectedNodeIds(prev => prev.filter(id => id !== nodeId));
    setHighlightedNodeIds([]);
  }, [findSchoolForNode, pushHistory])

  const handleClearChildren = useCallback((nodeIds: string[]) => {
    setTreeData(prev => {
      if (!prev) return prev;
      pushHistory(prev, `Cleared soft prereqs for ${nodeIds.length} nodes`);
      const newSchools = { ...prev.schools };

      nodeIds.forEach(nodeId => {
        const sourceSchoolName = findSchoolForNode(nodeId);
        if (!sourceSchoolName) return;
        
        const sourceSchool = newSchools[sourceSchoolName];
        const sourceNode = sourceSchool.nodes.find(n => n.formId === nodeId);
        if (!sourceNode || !sourceNode.children || sourceNode.children.length === 0) return;

        const childrenToSever = [...sourceNode.children];
        
        sourceNode.children = [];

        childrenToSever.forEach(childId => {
          const targetSchoolName = findSchoolForNode(childId);
          if (!targetSchoolName) return;
          const targetSchool = newSchools[targetSchoolName];
          const targetNode = targetSchool.nodes.find(n => n.formId === childId);
          if (targetNode) {
            targetNode.prerequisites = (targetNode.prerequisites || []).filter(id => id !== nodeId);
            targetNode.hardPrereqs = (targetNode.hardPrereqs || []).filter(id => id !== nodeId);
            targetNode.softPrereqs = (targetNode.softPrereqs || []).filter(id => id !== nodeId);
          }
        });
      });

      return { ...prev, schools: newSchools };
    });
    toast({ title: "Arcane Severance", description: "All selected child connections have been dissolved." });
  }, [findSchoolForNode, pushHistory, toast]);

  const handleClearHardPrereqs = useCallback((nodeIds: string[]) => {
    setTreeData(prev => {
      if (!prev) return prev;
      pushHistory(prev, `Cleared hard prereqs for ${nodeIds.length} nodes`);
      const newSchools = { ...prev.schools };

      nodeIds.forEach(nodeId => {
        const sourceSchoolName = findSchoolForNode(nodeId);
        if (!sourceSchoolName) return;
        
        const sourceSchool = newSchools[sourceSchoolName];
        const sourceNode = sourceSchool.nodes.find(n => n.formId === nodeId);
        if (!sourceNode || !sourceNode.hardPrereqs || sourceNode.hardPrereqs.length === 0) return;

        const parentsToSever = [...sourceNode.hardPrereqs];
        
        sourceNode.hardPrereqs = [];
        sourceNode.prerequisites = (sourceNode.prerequisites || []).filter(id => !parentsToSever.includes(id));

        parentsToSever.forEach(parentId => {
          const targetSchoolName = findSchoolForNode(parentId);
          if (!targetSchoolName) return;
          const targetSchool = newSchools[targetSchoolName];
          const targetNode = targetSchool.nodes.find(n => n.formId === parentId);
          if (targetNode) {
            targetNode.children = (targetNode.children || []).filter(id => id !== nodeId);
          }
        });
      });

      return { ...prev, schools: newSchools };
    });
    toast({ title: "Arcane Severance", description: "All selected hard prerequisites have been dissolved." });
  }, [findSchoolForNode, pushHistory, toast]);

  const handleClearSoftPrereqs = useCallback((nodeIds: string[]) => {
    setTreeData(prev => {
      if (!prev) return prev;
      pushHistory(prev, `Cleared soft prereqs for ${nodeIds.length} nodes`);
      const newSchools = { ...prev.schools };

      nodeIds.forEach(nodeId => {
        const sourceSchoolName = findSchoolForNode(nodeId);
        if (!sourceSchoolName) return;
        
        const sourceSchool = newSchools[sourceSchoolName];
        const sourceNode = sourceSchool.nodes.find(n => n.formId === nodeId);
        if (!sourceNode || !sourceNode.softPrereqs || sourceNode.softPrereqs.length === 0) return;

        const parentsToSever = [...sourceNode.softPrereqs];
        
        sourceNode.softPrereqs = [];
        sourceNode.prerequisites = (sourceNode.prerequisites || []).filter(id => !parentsToSever.includes(id));

        parentsToSever.forEach(parentId => {
          const targetSchoolName = findSchoolForNode(parentId);
          if (!targetSchoolName) return;
          const targetSchool = newSchools[targetSchoolName];
          const targetNode = targetSchool.nodes.find(n => n.formId === parentId);
          if (targetNode) {
            targetNode.children = (targetNode.children || []).filter(id => id !== nodeId);
          }
        });
      });

      return { ...prev, schools: newSchools };
    });
    toast({ title: "Arcane Severance", description: "All selected soft prerequisites have been dissolved." });
  }, [findSchoolForNode, pushHistory, toast]);

  const handleCondenseNodes = useCallback((nodeIds: string[]) => {
    if (!treeData || nodeIds.length < 2) return;
    
    setTreeData(prev => {
      if (!prev) return prev;
      pushHistory(prev, `Condensed ${nodeIds.length} nodes`);
      const newSchools = { ...prev.schools };
      
      const targets: { school: string, node: SpellNode }[] = [];
      let sumX = 0;
      let sumY = 0;

      nodeIds.forEach(id => {
        const sName = findSchoolForNode(id);
        if (!sName) return;
        const node = newSchools[sName].nodes.find(n => n.formId === id);
        if (node && !node.isLocked) {
          targets.push({ school: sName, node });
          sumX += node.x;
          sumY += node.y;
        }
      });

      if (targets.length < 2) return prev;

      const avgX = sumX / targets.length;
      const avgY = sumY / targets.length;

      const cols = Math.ceil(Math.sqrt(targets.length));
      const spacing = 30; 

      targets.forEach((target, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const targetX = Math.round(avgX + (col - (cols - 1) / 2) * spacing);
        const targetY = Math.round(avgY + (row - (row - 1) / 2) * spacing);

        const nodeIdx = newSchools[target.school].nodes.findIndex(n => n.formId === target.node.formId);
        if (nodeIdx !== -1) {
          newSchools[target.school].nodes[nodeIdx] = {
            ...newSchools[target.school].nodes[nodeIdx],
            x: targetX,
            y: targetY
          };
        }
      });

      return { ...prev, schools: newSchools };
    });

    toast({ title: "Arcane Compression", description: "Selected spells have been organized into a condensed grid." });
  }, [treeData, findSchoolForNode, pushHistory, toast]);

  const handleAddNode = () => { if (treeData && selectedSchool) setIsAddNodeOpen(true) }

  const handleConfirmAddNode = (details: Partial<SpellNode>) => {
    if (!treeData || !selectedSchool) return
    setTreeData(prev => {
      if (!prev) return prev
      const newNodeId = details.formId || ("0x" + Math.random().toString(16).slice(2, 10).toUpperCase())
      pushHistory(prev, `Added node: ${details.name || newNodeId}`)
      const school = prev.schools[selectedSchool]
      const firstRoot = school.roots?.[0]
      const referenceNode = school.nodes.find(n => n.formId === firstRoot) || school.nodes[0]
      const newNode: SpellNode = { formId: newNodeId, name: details.name || "New Spell", theme: details.theme || "_misc", tier: details.tier || 1, skillLevel: details.skillLevel || "Novice", x: (referenceNode?.x || 0) + 100, y: (referenceNode?.y || 0) + 100, children: [], prerequisites: [], hardPrereqs: [], softPrereqs: [], softNeeded: 0, isRoot: details.isRoot || false }
      
      const newRoots = details.isRoot ? [...(school.roots || []), newNodeId].slice(0, 3) : (school.roots || []);
      
      return { ...prev, schools: { ...prev.schools, [selectedSchool]: { ...school, nodes: [...school.nodes, newNode], roots: newRoots } } }
    })
    toast({ title: "Spell Manifested", description: `${details.name} has been added.` })
  }

  const handleSelectBySkillLevel = (level: string) => {
    if (!treeData) return
    const ids: string[] = []
    if (selectedSchool) {
      treeData.schools[selectedSchool].nodes.forEach(n => {
        if (n.skillLevel === level) ids.push(n.formId)
      })
    } else if (isGlobalView) {
      Object.values(treeData.schools).forEach(school => {
        school.nodes.forEach(n => {
          if (n.skillLevel === level) ids.push(n.formId)
        })
      })
    }
    setHighlightedNodeIds(ids)
    setSelectedNodeIds([])
    toast({ 
      title: "Selection Synchronized", 
      description: `All ${level} spells have been highlighted.` 
    })
  }

  const handleRebuildTree = useCallback(() => {
    if (!treeData) return
    const rebuilt = rebuildTree(treeData, randomizeTree)
    setTreeData(rebuilt)
    setSelectedNodeIds([])
    setHighlightedNodeIds([])
    toast({ 
      title: "Tree Rebuilt", 
      description: randomizeTree ? "Randomized connections applied." : "Rebuilt from guidelines." 
    })
  }, [treeData, randomizeTree, toast])

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeIds([id])
    setHighlightedNodeIds([])
  }, [setSelectedNodeIds, setHighlightedNodeIds])

  const selectedNode = useMemo(() => {
    if (!treeData || !selectedNodeId) return null
    for (const sName in treeData.schools) {
      const node = treeData.schools[sName].nodes.find(n => n.formId === selectedNodeId)
      if (node) return { node, schoolName: sName }
    }
    return null
  }, [treeData, selectedNodeId])

  const selectedSchoolData = useMemo(() => {
    if (!treeData || !selectedNode) return null
    return treeData.schools[selectedNode.schoolName]
  }, [treeData, selectedNode])

  const nodeSearchResults = useMemo(() => {
    if (!treeData || nodeSearchQuery.length < 2) return []
    const results: SpellNode[] = []
    const schoolsToSearch = selectedSchool === null ? Object.values(treeData.schools) : [treeData.schools[selectedSchool]]
    schoolsToSearch.forEach(school => {
      school.nodes.forEach(node => {
        if (node.name.toLowerCase().includes(nodeSearchQuery.toLowerCase()) || node.formId.toLowerCase().includes(nodeSearchQuery.toLowerCase())) results.push(node)
      })
    })
    return results.slice(0, 10)
  }, [treeData, selectedSchool, nodeSearchQuery])

  const sidebarSpellResults = useMemo(() => {
    if (!treeData || sidebarSpellQuery.length < 2) return []
    const results: { node: SpellNode; schoolName: string }[] = []
    Object.entries(treeData.schools).forEach(([name, school]) => {
      school.nodes.forEach(node => {
        if (node.name.toLowerCase().includes(sidebarSpellQuery.toLowerCase()) || node.formId.toLowerCase().includes(sidebarSpellQuery.toLowerCase())) {
          results.push({ node, schoolName: name })
        }
      })
    })
    return results.slice(0, 10)
  }, [treeData, sidebarSpellQuery])

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground rounded-lg border-2 border-border">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Toaster />
        <JSONImporter isOpen={isImportOpen} onOpenChange={setIsImportOpen} onImport={handleImport} onBuilderImport={(scan) => handleImport(buildTreeFromScan(scan))} />
        <AddNodeDialog isOpen={isAddNodeOpen} onOpenChange={setIsAddNodeOpen} onConfirm={handleConfirmAddNode} />

        <aside className={cn("flex flex-col border-r border-border bg-card/50 transition-all relative z-30", isSidebarCollapsed ? "w-16" : "w-72")}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              <h1 className="font-bold text-lg">HoM Tree Editor</h1>
            </div>
          )}
          <button className="p-2 hover:bg-secondary rounded-md" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 space-y-6">
              {!selectedSchool && !isGlobalView && (
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground px-2">Search Spells</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search spells..." className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent" value={sidebarSpellQuery} onChange={(e) => setSidebarSpellQuery(e.target.value)} />
                  </div>
                  {sidebarSpellResults.length > 0 && (
                    <div className="mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                      {sidebarSpellResults.map(({ node, schoolName }) => (
                        <button key={node.formId} onClick={() => { setSelectedNodeIds([node.formId]); setSelectedSchool(schoolName); setIsGlobalView(false); setSidebarSpellQuery(''); }} className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent/10 border-b border-border last:border-b-0">
                          <div className="flex flex-col items-start">
                            <span className="font-bold">{node.name}</span>
                            <span className="text-[9px] opacity-40">{node.formId}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">{schoolName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground px-2">Navigation</Label>
                <button onClick={() => { setSelectedSchool(null); setSelectedNodeIds([]); setHighlightedNodeIds([]); setIsGlobalView(false); }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md", (!selectedSchool && !isGlobalView) ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}>
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button onClick={() => { setSelectedSchool(null); setSelectedNodeIds([]); setHighlightedNodeIds([]); setIsGlobalView(true); }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md", isGlobalView ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}>
                  <Globe className="w-3.5 h-3.5" /> Arch-Grimoire Hub
                </button>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="controls" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 px-0 text-[10px] uppercase text-muted-foreground px-2">Grimoire Controls</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="px-2 py-2 space-y-2.5 bg-secondary/20 rounded-lg border border-border/40">
                      <ControlHint icon={<MousePointer2 className="w-3 h-3" />} text="Select Spell" hint="Click" />
                      <ControlHint icon={<Command className="w-3 h-3" />} text="Multi Select" hint="Cmd+Click" />
                      <ControlHint icon={<SquareDashedMousePointer className="w-3 h-3" />} text="Marquee" hint="Shift+Drag Bg" />
                      <ControlHint icon={<Link className="w-3 h-3" />} text="Link Nodes" hint="Shift+Drag Node" />
                      <ControlHint icon={<Move className="w-3 h-3" />} text="Pan View" hint="Alt+Drag" />
                      <ControlHint icon={<Undo2 className="w-3 h-3" />} hint="Ctrl+Z" text="Undo" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              {isGlobalView && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="history" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2 px-0 text-[10px] uppercase text-muted-foreground px-2">Action History</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="px-2 py-2 space-y-1 bg-secondary/20 rounded-lg border border-border/40 max-h-64 overflow-y-auto">
                        {history.length === 0 && (
                          <div className="text-[10px] text-muted-foreground text-center py-2">No actions yet</div>
                        )}
                        {history.slice(-10).reverse().map((entry, idx) => {
                          const realIndex = history.length - 1 - idx
                          return (
                            <div key={realIndex} className="flex items-center justify-between gap-2 py-1 border-b border-border/30 last:border-b-0">
                              <div className="flex flex-col items-start min-w-0">
                                <span className="text-[10px] truncate">{entry.description}</span>
                                <span className="text-[9px] text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => undoTo(realIndex)}>
                                <Undo2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground px-2">Schools</Label>
                  <div className="space-y-1 mt-2">
                    {treeData && Object.keys(treeData.schools).map(school => (
                      <button key={school} onClick={() => { setSelectedSchool(school); setSelectedNodeIds([]); setHighlightedNodeIds([]); setIsGlobalView(false); }} className={cn("w-full flex items-center justify-between px-3 py-2 text-sm rounded-md", selectedSchool === school ? "bg-primary text-accent" : "text-muted-foreground hover:bg-secondary")}>
                        <span className="flex items-center gap-2">
                          <Database className="w-3.5 h-3.5" /> {school}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: treeData?.schools[school]?.nodes[0]?.schoolColor || 'inherit' }}>{treeData?.schools[school]?.nodes.length ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
            </div>
            <div className="mt-auto p-4 border-t border-border space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" onClick={() => undoTo()} disabled={history.length === 0}><Undo2 className="w-3.5 h-3.5" /> Undo Action</Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" onClick={() => setIsImportOpen(true)}><Code className="w-3.5 h-3.5" /> Import JSON</Button>
              <Button className="w-full justify-start gap-2 text-xs" onClick={handleExport} disabled={!treeData}><Download className="w-3.5 h-3.5" /> Export Grimoire</Button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/30 z-20">
          <div className="flex items-center gap-6">
            <h2 className="font-bold">{selectedSchool || (isGlobalView ? "Arch-Grimoire Hub" : "Dashboard")}</h2>
            {(selectedSchool || isGlobalView) && (
              <Popover open={nodeSearchResults.length > 0}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search spell..." className="pl-8 h-8 w-48 text-xs rounded-full" value={nodeSearchQuery} onChange={(e) => setNodeSearchQuery(e.target.value)} />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="max-h-64 overflow-y-auto">
                    {nodeSearchResults.map(n => (
                      <button key={n.formId} onClick={() => { setSelectedNodeIds([n.formId]); setHighlightedNodeIds([]); setNodeSearchQuery(''); }} className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-accent/10 border-b border-border">
                        <div className="flex flex-col items-start"><span className="font-bold">{n.name}</span><span className="text-[9px] opacity-40">{n.formId}</span></div>
                        <Target className="w-3 h-3 text-accent" />
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {(selectedSchool || isGlobalView) && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className={cn("gap-2 text-xs", showRadialGuides ? "text-accent bg-accent/10" : "text-muted-foreground")} onClick={() => setShowRadialGuides(!showRadialGuides)}>
                  <Compass className="w-4 h-4" /> {showRadialGuides ? "Radial On" : "Radial Off"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
                      <CheckSquare className="w-4 h-4" /> Spell Tier
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'].map(level => (
                      <DropdownMenuItem key={level} onClick={() => handleSelectBySkillLevel(level)} className="text-xs">
                        {level}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-4 w-px bg-border mx-1" />

                <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground" onClick={handleRebuildTree}>
                  <RefreshCw className="w-4 h-4" /> Rebuild Tree
                </Button>

                <div className="flex items-center gap-2 pl-1">
                  <Label className="text-[10px] text-muted-foreground">Randomize</Label>
                  <Switch checked={randomizeTree} onCheckedChange={setRandomizeTree} />
                </div>
              </div>
            )}
          </div>
          {selectedSchool && <Button size="sm" onClick={handleAddNode}><Plus className="w-4 h-4" /> Add Spell</Button>}
        </header>

        <div className="flex-1 relative">
          {treeData && (selectedSchool ? (
            <TreeCanvas 
              schoolName={selectedSchool} 
              allSchools={treeData.schools} 
              selectedNodeIds={selectedNodeIds} 
              highlightedNodeIds={highlightedNodeIds}
              onSelectNodes={setSelectedNodeIds} 
              onClearHighlight={() => setHighlightedNodeIds([])}
              onNodesMove={handleUpdateNodes} 
              onLinkNodes={handleLinkNodes} 
              searchQuery={nodeSearchQuery} 
              showRadialGuides={showRadialGuides}
            />
          ) : isGlobalView ? (
            <GlobalGrimoireView 
              schools={treeData.schools} 
              selectedNodeIds={selectedNodeIds} 
              highlightedNodeIds={highlightedNodeIds}
              onSelectNodes={setSelectedNodeIds} 
              onClearHighlight={() => setHighlightedNodeIds([])}
              onNodesMove={handleUpdateNodes} 
              onLinkNodes={handleLinkNodes} 
              searchQuery={nodeSearchQuery} 
              showRadialGuides={showRadialGuides}
            />
          ) : (
            <DashboardView data={treeData} onSelectSchool={setSelectedSchool} />
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selectedNode && (
          <motion.aside
            initial={{ maxWidth: 0, opacity: 0 }}
            animate={{ maxWidth: "384px", opacity: 1 }}
            exit={{ maxWidth: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="border-l border-border bg-card z-30 overflow-hidden"
          >
            <div className="w-96 overflow-y-auto">
              <NodeEditor 
                  schoolName={selectedNode.schoolName} 
                  school={selectedSchoolData!} 
                  node={selectedNode.node} 
                selectedNodeIds={selectedNodeIds} 
                onUpdate={handleUpdateNode} 
                onUpdateNodes={handleUpdateNodes} 
                onUpdateSchool={handleUpdateSchool} 
                onToggleRelationship={handleToggleRelationship} 
                onDelete={handleDeleteNode} 
                onSelectNode={handleSelectNode} 
                onClearChildren={handleClearChildren}
                onClearHardPrereqs={handleClearHardPrereqs}
                onClearSoftPrereqs={handleClearSoftPrereqs}
                onCondense={handleCondenseNodes}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
    </div>
  )
}

function ControlHint({ icon, text, hint }: { icon: React.ReactNode, text: string, hint: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2"><span className="text-accent">{icon}</span><span className="text-[10px] text-muted-foreground">{text}</span></div>
      <span className="text-[9px] font-mono bg-background/50 px-1 py-0.5 rounded border border-border/30">{hint}</span>
    </div>
  )
}
