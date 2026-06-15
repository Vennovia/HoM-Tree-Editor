"use client"

import React, { useMemo } from 'react'
import { SpellTreeData } from '@/types/spell-tree'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Layers, 
  Zap, 
  Activity,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DashboardViewProps {
  data: SpellTreeData;
  onSelectSchool: (school: string) => void;
}

export function DashboardView({ data, onSelectSchool }: DashboardViewProps) {
  const stats = useMemo(() => {
    let totalNodes = 0;
    let totalLinks = 0;
    const schools = Object.keys(data.schools);
    const tierCounts: Record<number, number> = {};
    const skillLevelCounts: Record<string, number> = {};

    schools.forEach(schoolName => {
      const school = data.schools[schoolName];
      totalNodes += school.nodes.length;
      school.nodes.forEach(node => {
        totalLinks += (node.children || []).length;
        tierCounts[node.tier] = (tierCounts[node.tier] || 0) + 1;
        skillLevelCounts[node.skillLevel] = (skillLevelCounts[node.skillLevel] || 0) + 1;
      });
    });

    return {
      schoolCount: schools.length,
      totalNodes,
      totalLinks,
      tierCounts,
      skillLevelCounts,
    };
  }, [data]);

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="p-8 space-y-8 max-w-6xl mx-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-headline font-bold text-accent flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            Heart of Magic tree editor
          </h1>
          <p className="text-muted-foreground">Comprehensive overview of all mapped magical disciplines and their structures.</p>
        </div>

        {/* Top Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Schools" 
            value={stats.schoolCount} 
            icon={<Database className="w-4 h-4 text-blue-400" />} 
            description="Active magical disciplines" 
          />
          <StatCard 
            title="Total Nodes" 
            value={stats.totalNodes} 
            icon={<Layers className="w-4 h-4 text-purple-400" />} 
            description="Mapped spell abilities" 
          />
          <StatCard 
            title="Connections" 
            value={stats.totalLinks} 
            icon={<Zap className="w-4 h-4 text-yellow-400" />} 
            description="Active arcane pathways" 
          />
          <StatCard 
            title="Avg Density" 
            value={(stats.totalLinks / stats.totalNodes || 0).toFixed(2)} 
            icon={<Activity className="w-4 h-4 text-green-400" />} 
            description="Links per node" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schools List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Magical Disciplines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(data.schools).map(schoolName => {
                const school = data.schools[schoolName];
                return (
                  <Card key={schoolName} className="bg-card/40 border-border hover:border-accent/50 transition-colors group cursor-pointer" onClick={() => onSelectSchool(schoolName)}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-headline text-foreground group-hover:text-accent transition-colors">{schoolName}</CardTitle>
                        <Badge variant="outline" className="text-[10px] uppercase">{school.nodes.length} Nodes</Badge>
                      </div>
                      <CardDescription className="text-xs">Root: {school.root}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex justify-between items-center">
                      <div className="flex gap-2">
                        {/* Summary of levels in this school */}
                        {Array.from(new Set(school.nodes.map(n => n.skillLevel))).slice(0, 3).map(lvl => (
                          <span key={lvl} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{lvl}</span>
                        ))}
                      </div>
                      <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Master Stats / Distribution */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Skill Distribution</h3>
              <Card className="bg-card/40 border-border">
                <CardContent className="p-6 space-y-4">
                  {Object.entries(stats.skillLevelCounts).sort((a, b) => b[1] - a[1]).map(([level, count]) => (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{level}</span>
                        <span className="font-bold text-accent">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(count / stats.totalNodes) * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

function StatCard({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) {
  return (
    <Card className="bg-card/40 border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold font-headline">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
