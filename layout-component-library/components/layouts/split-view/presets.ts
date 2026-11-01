import type { SplitViewConfig } from "./types"

/**
 * IDE Layout: Sidebar + Editor + Preview
 */
export const ideLayout: SplitViewConfig = {
  id: "ide-layout",
  name: "IDE Layout",
  description: "Three-pane layout for code editing with sidebar and preview",
  direction: "horizontal",
  persistState: true,
  storageKey: "ide-layout-state",
  showHandles: true,
  panels: [
    {
      id: "sidebar",
      position: "left",
      defaultSize: 250,
      minSize: 200,
      maxSize: 400,
      collapsible: true,
      resizable: true,
      label: "File Explorer",
    },
    {
      id: "editor",
      position: "center",
      defaultSize: 600,
      minSize: 400,
      resizable: true,
      label: "Editor",
    },
    {
      id: "preview",
      position: "right",
      defaultSize: 400,
      minSize: 300,
      maxSize: 800,
      collapsible: true,
      resizable: true,
      label: "Preview",
    },
  ],
}

/**
 * Email Layout: Folders + List + Detail
 */
export const emailLayout: SplitViewConfig = {
  id: "email-layout",
  name: "Email Layout",
  description: "Three-pane layout for email clients",
  direction: "horizontal",
  persistState: true,
  storageKey: "email-layout-state",
  showHandles: true,
  panels: [
    {
      id: "folders",
      position: "left",
      defaultSize: 200,
      minSize: 150,
      maxSize: 300,
      collapsible: true,
      resizable: true,
      label: "Folders",
    },
    {
      id: "list",
      position: "center",
      defaultSize: 350,
      minSize: 250,
      resizable: true,
      label: "Message List",
    },
    {
      id: "detail",
      position: "right",
      defaultSize: 600,
      minSize: 400,
      resizable: true,
      label: "Message Detail",
    },
  ],
}

/**
 * Design Tool Layout: Layers + Canvas + Properties
 */
export const designToolLayout: SplitViewConfig = {
  id: "design-tool-layout",
  name: "Design Tool Layout",
  description: "Three-pane layout for design applications",
  direction: "horizontal",
  persistState: true,
  storageKey: "design-tool-layout-state",
  showHandles: true,
  panels: [
    {
      id: "layers",
      position: "left",
      defaultSize: 250,
      minSize: 200,
      maxSize: 400,
      collapsible: true,
      resizable: true,
      label: "Layers",
    },
    {
      id: "canvas",
      position: "center",
      defaultSize: 800,
      minSize: 500,
      resizable: true,
      label: "Canvas",
    },
    {
      id: "properties",
      position: "right",
      defaultSize: 300,
      minSize: 250,
      maxSize: 500,
      collapsible: true,
      resizable: true,
      label: "Properties",
    },
  ],
}

/**
 * Documentation Layout: TOC + Content + On-this-page
 */
export const docsLayout: SplitViewConfig = {
  id: "docs-layout",
  name: "Documentation Layout",
  description: "Three-pane layout for documentation sites",
  direction: "horizontal",
  persistState: true,
  storageKey: "docs-layout-state",
  showHandles: true,
  panels: [
    {
      id: "toc",
      position: "left",
      defaultSize: 250,
      minSize: 200,
      maxSize: 350,
      collapsible: true,
      resizable: true,
      label: "Table of Contents",
    },
    {
      id: "content",
      position: "center",
      defaultSize: 700,
      minSize: 500,
      resizable: true,
      label: "Content",
    },
    {
      id: "on-this-page",
      position: "right",
      defaultSize: 200,
      minSize: 150,
      maxSize: 300,
      collapsible: true,
      resizable: true,
      defaultCollapsed: false,
      label: "On This Page",
    },
  ],
}

/**
 * Data Explorer Layout: Schema + Query + Results
 */
export const dataExplorerLayout: SplitViewConfig = {
  id: "data-explorer-layout",
  name: "Data Explorer Layout",
  description: "Three-pane layout for database tools",
  direction: "horizontal",
  persistState: true,
  storageKey: "data-explorer-layout-state",
  showHandles: true,
  panels: [
    {
      id: "schema",
      position: "left",
      defaultSize: 250,
      minSize: 200,
      maxSize: 400,
      collapsible: true,
      resizable: true,
      label: "Schema",
    },
    {
      id: "query",
      position: "center",
      defaultSize: 600,
      minSize: 400,
      resizable: true,
      label: "Query Editor",
    },
    {
      id: "results",
      position: "right",
      defaultSize: 400,
      minSize: 300,
      collapsible: true,
      resizable: true,
      label: "Results",
    },
  ],
}

export const splitViewPresets = {
  ide: ideLayout,
  email: emailLayout,
  designTool: designToolLayout,
  docs: docsLayout,
  dataExplorer: dataExplorerLayout,
}

export const idePreset = ideLayout
export const emailPreset = emailLayout
export const designToolPreset = designToolLayout
export const docsPreset = docsLayout
export const dataExplorerPreset = dataExplorerLayout
