"use client"

import type React from "react"

import { useState } from "react"
import type { BuilderAction } from "@/lib/builder/actions"
import type { BlockType, BlockCategory } from "@/lib/builder/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Layers, Layout, Box, Navigation, Loader2 } from "lucide-react"

interface ComponentLibraryProps {
  dispatch: React.Dispatch<BuilderAction>
}

const blockDefinitions: Record<BlockCategory, Array<{ type: BlockType; name: string; icon: any }>> = {
  shells: [
    { type: "shell:app", name: "App Shell", icon: Layers },
    { type: "shell:marketing", name: "Marketing Shell", icon: Layers },
    { type: "shell:dashboard", name: "Dashboard Shell", icon: Layers },
  ],
  layouts: [
    { type: "layout:bento-grid", name: "Bento Grid", icon: Layout },
    { type: "layout:split-view", name: "Split View", icon: Layout },
    { type: "layout:stack", name: "Stack", icon: Layout },
  ],
  sections: [
    { type: "section:hero", name: "Hero", icon: Box },
    { type: "section:features", name: "Features", icon: Box },
    { type: "section:pricing", name: "Pricing", icon: Box },
    { type: "section:cta", name: "CTA", icon: Box },
  ],
  navigation: [
    { type: "nav:top", name: "Top Nav", icon: Navigation },
    { type: "nav:sidebar", name: "Sidebar Nav", icon: Navigation },
    { type: "nav:breadcrumbs", name: "Breadcrumbs", icon: Navigation },
  ],
  loading: [
    { type: "loading:skeleton", name: "Skeleton", icon: Loader2 },
    { type: "loading:spinner", name: "Spinner", icon: Loader2 },
  ],
}

export function ComponentLibrary({ dispatch }: ComponentLibraryProps) {
  const [activeTab, setActiveTab] = useState<BlockCategory>("sections")

  const handleAddBlock = (type: BlockType, name: string) => {
    const node = {
      id: `${type}-${Date.now()}`,
      type,
      label: name,
      parentId: null,
      children: [],
      props: {},
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    dispatch({ type: "ADD_NODE", payload: { node, parentId: null } })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 border-b flex items-center px-3">
        <h2 className="text-sm font-medium">Components</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BlockCategory)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-10">
          <TabsTrigger
            value="shells"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Shells
          </TabsTrigger>
          <TabsTrigger
            value="layouts"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Layouts
          </TabsTrigger>
          <TabsTrigger
            value="sections"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Sections
          </TabsTrigger>
          <TabsTrigger
            value="navigation"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Navigation
          </TabsTrigger>
          <TabsTrigger
            value="loading"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Loading
          </TabsTrigger>
        </TabsList>

        {Object.entries(blockDefinitions).map(([category, blocks]) => (
          <TabsContent key={category} value={category} className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-4 gap-2 p-3">
                {blocks.map(({ type, name, icon: Icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col gap-2 py-3 bg-transparent"
                    onClick={() => handleAddBlock(type, name)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{name}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
