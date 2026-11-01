/**
 * Layout Builder Types
 * Core type system for the visual layout builder
 */

/**
 * Block types that can be added to the canvas
 */
export type BlockType =
  // Shells
  | "shell:app"
  | "shell:marketing"
  | "shell:dashboard"
  | "shell:docs"
  | "shell:auth"
  // Layouts
  | "layout:bento-grid"
  | "layout:sidebar"
  | "layout:split"
  | "layout:stack"
  | "layout:cluster"
  | "layout:split-view"
  // Sections
  | "section:hero"
  | "section:features"
  | "section:pricing"
  | "section:cta"
  | "section:testimonials"
  | "section:stats"
  | "section:faq"
  | "section:logo-cloud"
  // Navigation
  | "nav:top"
  | "nav:sidebar"
  | "nav:mobile"
  | "nav:breadcrumbs"
  | "nav:tabs"
  | "nav:pagination"
  // Loading
  | "loading:skeleton"
  | "loading:spinner"
  | "loading:async-container"
  | "loading:progressive"

/**
 * Block category for organization
 */
export type BlockCategory = "shells" | "layouts" | "sections" | "navigation" | "loading"

/**
 * Node in the builder tree
 * Every element on the canvas is a node
 */
export interface BuilderNode {
  /**
   * Unique node identifier
   */
  id: string

  /**
   * Block type
   */
  type: BlockType

  /**
   * Human-readable label
   */
  label: string

  /**
   * Parent node ID (null for root)
   */
  parentId: string | null

  /**
   * Child node IDs (ordered)
   */
  children: string[]

  /**
   * Component props (type-safe per block type)
   */
  props: Record<string, unknown>

  /**
   * Visual properties
   */
  style?: {
    /**
     * Z-index for layering
     */
    zIndex?: number

    /**
     * Visibility
     */
    visible?: boolean

    /**
     * Locked (prevents editing)
     */
    locked?: boolean
  }

  /**
   * Metadata
   */
  metadata?: {
    /**
     * Creation timestamp
     */
    createdAt: number

    /**
     * Last modified timestamp
     */
    updatedAt: number

    /**
     * User notes
     */
    notes?: string

    /**
     * Slot ID if this node is in a container slot
     */
    slotId?: string
  }
}

/**
 * Builder state
 */
export interface BuilderState {
  /**
   * All nodes in the tree (keyed by ID)
   */
  nodes: Record<string, BuilderNode>

  /**
   * Root node IDs (top-level blocks)
   */
  rootIds: string[]

  /**
   * Currently selected node IDs
   */
  selectedIds: string[]

  /**
   * Hovered node ID
   */
  hoveredId: string | null

  /**
   * Canvas state
   */
  canvas: {
    /**
     * Zoom level (1 = 100%)
     */
    zoom: number

    /**
     * Pan offset
     */
    pan: { x: number; y: number }

    /**
     * Viewport size
     */
    viewport: { width: number; height: number }
  }

  /**
   * History for undo/redo
   */
  history: {
    /**
     * Past states
     */
    past: BuilderState[]

    /**
     * Future states (for redo)
     */
    future: BuilderState[]
  }
}

/**
 * Block definition for the component palette
 */
export interface BlockDefinition {
  /**
   * Block type
   */
  type: BlockType

  /**
   * Category
   */
  category: BlockCategory

  /**
   * Display name
   */
  name: string

  /**
   * Description
   */
  description: string

  /**
   * Icon (React component or string)
   */
  icon?: string

  /**
   * Default props
   */
  defaultProps: Record<string, unknown>

  /**
   * Can contain children
   */
  canHaveChildren: boolean

  /**
   * Allowed parent types (null = any)
   */
  allowedParents?: BlockType[] | null

  /**
   * Allowed child types (null = any)
   */
  allowedChildren?: BlockType[] | null

  /**
   * Maximum children (null = unlimited)
   */
  maxChildren?: number | null

  /**
   * Slot definitions (for containers)
   */
  slots?: SlotDefinition[]
}

/**
 * Slot definition for container blocks
 */
export interface SlotDefinition {
  /**
   * Slot identifier (e.g., 'header', 'sidebar', 'main')
   */
  id: string

  /**
   * Display label
   */
  label: string

  /**
   * Description
   */
  description?: string

  /**
   * Accepted block types (null = any)
   */
  accepts?: BlockType[] | null

  /**
   * Is this slot required?
   */
  required?: boolean

  /**
   * Can have multiple children?
   */
  multiple?: boolean

  /**
   * Maximum children (null = unlimited)
   */
  maxChildren?: number | null
}

/**
 * Container node with slots
 */
export interface ContainerNode extends BuilderNode {
  /**
   * Slot assignments (slot ID -> child node IDs)
   */
  slots?: Record<string, string[]>
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}
