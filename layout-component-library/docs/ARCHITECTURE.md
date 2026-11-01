# Architecture Overview

## Design Philosophy

This library follows a **composable, modular architecture** where each system does one thing well and composes cleanly with others.

### Core Principles

1. **Single Responsibility** - Each component has one clear purpose
2. **Composability** - Components work together seamlessly
3. **Type Safety** - Strong TypeScript types throughout
4. **Accessibility** - ARIA labels, keyboard navigation, semantic HTML
5. **Performance** - Optimized rendering, minimal re-renders
6. **Developer Experience** - Intuitive APIs, clear documentation

## System Layers

\`\`\`
┌─────────────────────────────────────────┐
│           Application Layer             │
│  (Your app code using the library)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Composition Layer              │
│  (How systems work together)            │
│  - CompositionProvider                  │
│  - Compound components                  │
│  - Slot-based APIs                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Component Layer               │
│  (Individual systems)                   │
│  - Shells (page structure)              │
│  - Navigation (interactive elements)    │
│  - Layouts (content arrangement)        │
│  - Loading (async states)               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Foundation Layer               │
│  (Core utilities and types)             │
│  - Type definitions                     │
│  - Utility functions                    │
│  - Shared constants                     │
└─────────────────────────────────────────┘
\`\`\`

## Component Systems

### 1. Shells (Page Structure)

**Purpose:** Define overall page layout structure

**Components:**
- `AppShell` - SaaS application layout
- `MarketingShell` - Landing page layout
- `DashboardShell` - Data-heavy interface
- `DocsShell` - Documentation layout
- `AuthShell` - Authentication pages

**API Pattern:** Compound components
\`\`\`tsx
<AppShell>
  <AppShell.Header>...</AppShell.Header>
  <AppShell.Sidebar>...</AppShell.Sidebar>
  <AppShell.Main>...</AppShell.Main>
</AppShell>
\`\`\`

### 2. Navigation (Interactive Elements)

**Purpose:** Provide navigation UI components

**Components:**
- `TopNav` - Horizontal navigation bar
- `SidebarNav` - Vertical navigation with nesting
- `MobileNav` - Mobile drawer navigation
- `Breadcrumbs` - Path navigation
- `Tabs` - Tab navigation
- `Pagination` - Page navigation

**API Pattern:** Config-based
\`\`\`tsx
<TopNav config={{ items: [...] }} />
\`\`\`

### 3. Layouts (Content Arrangement)

**Purpose:** Arrange content within page sections

**Components:**
- `BentoGrid` - Asymmetric grid layout
- `SidebarLayout` - Sidebar + main content
- `SplitLayout` - Two-panel layouts
- `StackLayout` - Vertical/horizontal stacking
- `ClusterLayout` - Wrapping flex layout

**API Pattern:** Slot-based
\`\`\`tsx
<BentoGrid config={preset}>
  <BentoSlot id="hero">...</BentoSlot>
  <BentoSlot id="feature1">...</BentoSlot>
</BentoGrid>
\`\`\`

### 4. Loading States (Async Management)

**Purpose:** Handle loading, error, and empty states

**Components:**
- `Skeleton` - Loading placeholders
- `Spinner` - Loading indicators
- `AsyncContainer` - All-in-one async state handler
- `ProgressiveLoader` - Smart loading with delays

**API Pattern:** Wrapper components
\`\`\`tsx
<AsyncContainer state={asyncState}>
  {data => <YourContent data={data} />}
</AsyncContainer>
\`\`\`

## Composition Patterns

### Pattern 1: Shell + Navigation + Layout

\`\`\`tsx
<AppShell>
  <AppShell.Header>
    <TopNav config={navConfig} />
  </AppShell.Header>
  
  <AppShell.Sidebar>
    <SidebarNav config={sidebarConfig} />
  </AppShell.Sidebar>
  
  <AppShell.Main>
    <BentoGrid preset="featured">
      <BentoSlot id="hero">
        <AsyncContainer state={heroState}>
          {data => <HeroContent data={data} />}
        </AsyncContainer>
      </BentoSlot>
    </BentoGrid>
  </AppShell.Main>
</AppShell>
\`\`\`

### Pattern 2: Nested Layouts

\`\`\`tsx
<SplitLayout config={{ ratio: "60/40" }}>
  <div slot="left">
    <StackLayout config={{ direction: "vertical", gap: "lg" }}>
      <Card>Content 1</Card>
      <Card>Content 2</Card>
    </StackLayout>
  </div>
  
  <div slot="right">
    <ClusterLayout config={{ gap: "md" }}>
      <Tag>Tag 1</Tag>
      <Tag>Tag 2</Tag>
    </ClusterLayout>
  </div>
</SplitLayout>
\`\`\`

### Pattern 3: Loading States Everywhere

\`\`\`tsx
// At shell level
<AppShell>
  <AppShell.Main>
    <ProgressiveLoader isLoading={isPageLoading}>
      <PageContent />
    </ProgressiveLoader>
  </AppShell.Main>
</AppShell>

// At layout level
<BentoGrid preset="featured">
  <BentoSlot id="stats">
    <AsyncContainer state={statsState}>
      {data => <StatsCards data={data} />}
    </AsyncContainer>
  </BentoSlot>
</BentoGrid>

// At component level
<Card>
  {isLoading ? <SkeletonCard /> : <CardContent />}
</Card>
\`\`\`

## Import Patterns

### Barrel Exports

All systems have barrel exports for convenience:

\`\`\`tsx
// Import everything from one system
import { AppShell, MarketingShell, DashboardShell } from "@/components/shells"

// Import specific components
import { TopNav, SidebarNav } from "@/components/navigation"

// Import layouts
import { BentoGrid, StackLayout } from "@/components/layouts"

// Import loading states
import { AsyncContainer, Skeleton } from "@/components/loading"
\`\`\`

### Direct Imports

For tree-shaking optimization:

\`\`\`tsx
import { AppShell } from "@/components/shells/app-shell/app-shell"
import { TopNav } from "@/components/navigation/top-nav/top-nav"
\`\`\`

## Type Safety

All components are fully typed with TypeScript:

\`\`\`tsx
import type { AppShellProps } from "@/components/shells"
import type { NavConfig } from "@/lib/navigation/types"
import type { BentoGridConfig } from "@/components/layouts"

const navConfig: NavConfig = {
  items: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
  ]
}

const shellProps: AppShellProps = {
  sidebarWidth: 280,
  collapsible: true,
}
\`\`\`

## Extending the Library

### Adding a New Layout

1. Create directory: `components/layouts/my-layout/`
2. Add files:
   - `types.ts` - Type definitions
   - `my-layout.tsx` - Component implementation
   - `presets.ts` - Pre-configured layouts
3. Export from `components/layouts/index.ts`
4. Add to documentation

### Adding a New Shell

1. Create directory: `components/shells/my-shell/`
2. Use compound component pattern
3. Integrate with CompositionProvider
4. Export from `components/shells/index.ts`

### Adding a New Navigation Pattern

1. Create directory: `components/navigation/my-nav/`
2. Use config-based API
3. Handle accessibility (ARIA, keyboard nav)
4. Export from `components/navigation/index.ts`

## Best Practices

1. **Always use compound components for shells** - Type-safe, composable
2. **Wrap async content in AsyncContainer** - Consistent loading/error handling
3. **Use presets for common patterns** - Faster development
4. **Leverage barrel exports** - Cleaner imports
5. **Compose layouts inside shells** - Clear separation of concerns
6. **Use CompositionProvider for shared state** - Active routes, mobile menu, etc.

## Performance Considerations

1. **Lazy load heavy components** - Use React.lazy() for large components
2. **Memoize expensive computations** - Use useMemo for complex calculations
3. **Avoid prop drilling** - Use CompositionProvider for shared state
4. **Use CSS for animations** - Better performance than JS animations
5. **Optimize images** - Use Next.js Image component

## Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast compliance

## Testing Strategy

1. **Unit tests** - Test individual components
2. **Integration tests** - Test composition patterns
3. **Visual regression tests** - Catch UI changes
4. **Accessibility tests** - Automated a11y checks
5. **Performance tests** - Monitor bundle size, render time
