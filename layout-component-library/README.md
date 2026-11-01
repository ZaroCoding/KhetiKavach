# Layout Templates

A comprehensive library of production-ready layout patterns, page shells, navigation components, and section templates for Next.js applications.

## Features

- 🎨 **6 Layout Systems** - Bento grids, split views, sidebars, stacks, clusters
- 🏗️ **5 Page Shells** - App, marketing, dashboard, docs, auth layouts
- 🧭 **6 Navigation Patterns** - Top nav, sidebar nav, mobile nav, breadcrumbs, tabs, pagination
- 📄 **4 Section Templates** - Hero, features, pricing, CTA sections
- ⏳ **4 Loading States** - Skeletons, spinners, async containers, progressive loading
- 🎯 **Fully Composable** - Mix and match components to build complex layouts
- 🔧 **CLI Tool** - Add components to your project like shadcn/ui
- 💪 **Type-Safe** - Full TypeScript support with strict types
- 🎨 **Customizable** - Built with Tailwind CSS and CVA

## Quick Start

### 1. Initialize

\`\`\`bash
npx layout-templates init
\`\`\`

### 2. Add Components

\`\`\`bash
# Add a layout
npx layout-templates add bento-grid

# Add a shell
npx layout-templates add app-shell

# Add navigation
npx layout-templates add top-nav

# Add sections
npx layout-templates add hero
\`\`\`

### 3. Use in Your App

\`\`\`tsx
import { AppShell } from "@/components/shells"
import { TopNav } from "@/components/navigation"
import { HeroSection } from "@/components/sections"

export default function Page() {
  return (
    <AppShell>
      <AppShell.Header>
        <TopNav items={navItems} />
      </AppShell.Header>
      <AppShell.Main>
        <HeroSection
          variant="centered"
          title="Welcome"
          description="Build faster with layout templates"
        />
      </AppShell.Main>
    </AppShell>
  )
}
\`\`\`

## Documentation

- [CLI Documentation](./docs/CLI.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Composition Guide](./docs/COMPOSITION.md)

## Examples

Visit the showcase pages to see all components in action:

- `/` - Homepage with overview
- `/layouts-showcase` - All layout patterns
- `/shells-showcase` - All page shells
- `/navigation-showcase` - All navigation components
- `/sections-showcase` - All section templates
- `/split-view-showcase` - Split-view layouts
- `/loading-showcase` - Loading states
- `/composition-examples` - Composition patterns
- `/builder` - Visual layout builder

## Philosophy

This library follows the shadcn/ui approach:

- **Copy, don't install** - Components are copied to your project, you own the code
- **Composable** - Small, focused components that work together
- **Type-safe** - Full TypeScript support with strict types
- **Customizable** - Built with Tailwind CSS, easy to modify
- **Production-ready** - Battle-tested patterns used in real applications

## Components

### Layouts
- **Bento Grid** - Asymmetric grid with flexible slots
- **Sidebar** - Collapsible sidebar layout
- **Split** - Two-panel split layout
- **Stack** - Vertical stacking layout
- **Cluster** - Horizontal clustering layout
- **Split View** - Resizable multi-panel layout

### Shells
- **App Shell** - Application layout with header, sidebar, main, footer
- **Marketing Shell** - Marketing page layout
- **Dashboard Shell** - Dashboard with stats area
- **Docs Shell** - Documentation with TOC
- **Auth Shell** - Authentication pages

### Navigation
- **Top Nav** - Horizontal navigation bar
- **Sidebar Nav** - Vertical sidebar navigation
- **Mobile Nav** - Mobile-responsive drawer
- **Breadcrumbs** - Breadcrumb navigation
- **Tabs** - Tab navigation (4 variants)
- **Pagination** - Pagination controls

### Sections
- **Hero** - Hero sections (4 variants)
- **Features** - Feature sections (4 layouts)
- **Pricing** - Pricing tables with toggle
- **CTA** - Call-to-action sections (3 variants)

### Loading
- **Skeleton** - Loading placeholders
- **Spinner** - Loading spinners (3 variants)
- **Async Container** - Async state management
- **Progressive** - Progressive loading

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT
