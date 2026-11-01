# Composition Architecture

This document explains how all the pieces of the layout system compose together.

## Architecture Overview

\`\`\`
┌─────────────────────────────────────────┐
│     CompositionProvider (Optional)      │
│  Manages shared state across components │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼────────┐
│     Shells     │    │   Navigation    │
│  Page Structure│◄───┤  Nav Components │
└───────┬────────┘    └─────────────────┘
        │
        │ Contains
        │
┌───────▼────────┐    ┌─────────────────┐
│    Layouts     │    │ Loading States  │
│Content Arrange │◄───┤  Async Handling │
└────────────────┘    └─────────────────┘
\`\`\`

## Composition Layers

### Layer 1: Shells (Page Structure)
Shells define the overall page structure with slots for different areas.

**Available Shells:**
- `AppShell` - SaaS app with sidebar
- `MarketingShell` - Landing page with hero
- `DashboardShell` - Data-heavy interface
- `DocsShell` - Documentation layout
- `AuthShell` - Centered auth forms

**Usage:**
\`\`\`tsx
<AppShell>
  <AppShell.Header>{/* Nav goes here */}</AppShell.Header>
  <AppShell.Sidebar>{/* Sidebar nav goes here */}</AppShell.Sidebar>
  <AppShell.Main>{/* Content goes here */}</AppShell.Main>
</AppShell>
\`\`\`

### Layer 2: Navigation (Interactive Elements)
Navigation components are placed inside shell slots.

**Available Navigation:**
- `TopNav` - Horizontal navigation
- `SidebarNav` - Vertical navigation with groups
- `MobileNav` - Responsive drawer
- `Breadcrumbs` - Path navigation
- `Tabs` - Tab navigation
- `Pagination` - Page navigation

**Usage:**
\`\`\`tsx
<AppShell.Header>
  <TopNav config={navConfig} />
</AppShell.Header>
\`\`\`

### Layer 3: Layouts (Content Arrangement)
Layouts arrange content inside the main area.

**Available Layouts:**
- `BentoGrid` - Asymmetric grid
- `SidebarLayout` - Content with sidebar
- `SplitLayout` - Two-column split
- `Stack` - Vertical/horizontal stacking
- `Cluster` - Wrapping flex layout

**Usage:**
\`\`\`tsx
<AppShell.Main>
  <BentoGrid config={gridConfig}>
    <Card>Content 1</Card>
    <Card>Content 2</Card>
  </BentoGrid>
</AppShell.Main>
\`\`\`

### Layer 4: Loading States (Async Handling)
Loading states wrap any content to handle async operations.

**Available Loading:**
- `AsyncContainer` - Handles loading/error/empty/success
- `Skeleton` - Placeholder content
- `Spinner` - Loading indicator
- `ProgressiveLoader` - Fade-in loading

**Usage:**
\`\`\`tsx
<AsyncContainer state={loadingState}>
  <BentoGrid config={gridConfig}>
    {/* Content */}
  </BentoGrid>
</AsyncContainer>
\`\`\`

## Complete Example

\`\`\`tsx
import { CompositionProvider } from "@/lib/composition"
import { AppShell } from "@/components/shells/app-shell/app-shell"
import { TopNav } from "@/components/navigation/top-nav/top-nav"
import { SidebarNav } from "@/components/navigation/sidebar-nav/sidebar-nav"
import { BentoGrid } from "@/components/layouts/bento-grid/bento-grid"
import { AsyncContainer } from "@/components/loading/async-container/async-container"

export default function MyApp() {
  return (
    <CompositionProvider>
      <AppShell>
        <AppShell.Header>
          <TopNav config={topNavConfig} />
        </AppShell.Header>
        
        <AppShell.Sidebar>
          <SidebarNav config={sidebarConfig} />
        </AppShell.Sidebar>
        
        <AppShell.Main>
          <AsyncContainer state={loadingState}>
            <BentoGrid config={gridConfig}>
              <Card>Dashboard Widget 1</Card>
              <Card>Dashboard Widget 2</Card>
              <Card>Dashboard Widget 3</Card>
            </BentoGrid>
          </AsyncContainer>
        </AppShell.Main>
      </AppShell>
    </CompositionProvider>
  )
}
\`\`\`

## Shared State

The `CompositionProvider` manages shared state:
- Active route tracking
- Mobile menu open/close
- Sidebar open/close
- Theme preferences

Components can access this state using `useComposition()`:

\`\`\`tsx
const { isSidebarOpen, setIsSidebarOpen } = useComposition()
\`\`\`

## Benefits

1. **Modularity** - Each piece works independently
2. **Composability** - Pieces snap together naturally
3. **Type Safety** - Full TypeScript support
4. **Flexibility** - Mix and match as needed
5. **Shared State** - Coordinated behavior across components
