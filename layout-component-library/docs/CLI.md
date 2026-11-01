# Layout Templates CLI

A CLI tool to add layout components to your Next.js project, similar to shadcn/ui.

## Installation

No installation required! Use `npx` to run commands directly.

## Usage

### Initialize

Set up your project with the necessary configuration:

\`\`\`bash
npx layout-templates init
\`\`\`

This creates:
- `components.json` - Configuration file
- Directory structure for components
- `lib/utils.ts` with the `cn()` helper

### Add Components

Add individual components to your project:

\`\`\`bash
npx layout-templates add <component-name>
\`\`\`

**Examples:**

\`\`\`bash
# Add a layout
npx layout-templates add bento-grid
npx layout-templates add split-view

# Add a shell
npx layout-templates add app-shell
npx layout-templates add marketing-shell

# Add navigation
npx layout-templates add top-nav
npx layout-templates add sidebar-nav

# Add sections
npx layout-templates add hero
npx layout-templates add pricing

# Add loading states
npx layout-templates add skeleton
npx layout-templates add async-container
\`\`\`

## Available Components

### Layouts
- `bento-grid` - Asymmetric grid layout with flexible slots
- `sidebar` - Sidebar layout with collapsible panel
- `split` - Two-panel split layout
- `stack` - Vertical stacking layout
- `cluster` - Horizontal clustering layout
- `split-view` - Resizable multi-panel layout (IDE, email, etc.)

### Shells
- `app-shell` - Application shell with header, sidebar, main, footer
- `marketing-shell` - Marketing page shell
- `dashboard-shell` - Dashboard shell with stats area
- `docs-shell` - Documentation shell with TOC
- `auth-shell` - Authentication page shell

### Navigation
- `top-nav` - Horizontal top navigation bar
- `sidebar-nav` - Vertical sidebar navigation
- `mobile-nav` - Mobile-responsive navigation drawer
- `breadcrumbs` - Breadcrumb navigation
- `tabs` - Tab navigation (4 variants)
- `pagination` - Pagination controls

### Sections
- `hero` - Hero sections (centered, split, minimal, video)
- `features` - Feature sections (grid, alternating, bento, cards)
- `pricing` - Pricing sections with billing toggle
- `cta` - Call-to-action sections (centered, split, banner)

### Loading States
- `skeleton` - Skeleton loading placeholders
- `spinner` - Loading spinners (3 variants)
- `async-container` - Container for async states
- `progressive` - Progressive loading with delays

## Configuration

The `components.json` file controls where components are installed:

\`\`\`json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
\`\`\`

## How It Works

1. **Registry** - Components are defined in `registry/registry.json` with their files and dependencies
2. **GitHub Source** - Files are fetched from the GitHub repository
3. **Transform** - Import paths are transformed based on your config
4. **Install** - Files are written to your project and dependencies are installed

## Publishing Your Own Registry

To use this CLI with your own components:

1. Fork this repository
2. Update `GITHUB_RAW_URL` in `scripts/cli/add.ts` with your repo URL
3. Customize `registry/registry.json` with your components
4. Publish to npm or use directly with npx

## Comparison to shadcn/ui

Like shadcn/ui, this CLI:
- ✅ Copies code directly to your project (you own it)
- ✅ Uses GitHub as the source of truth
- ✅ Handles dependencies automatically
- ✅ Transforms import paths based on config
- ✅ No package to maintain or update

Unlike shadcn/ui:
- Focuses on layout patterns instead of UI components
- Includes complete page shells and section patterns
- Provides composition utilities for building complex layouts

## Troubleshooting

**Command not found**

Make sure you're using `npx`:
\`\`\`bash
npx layout-templates init
\`\`\`

**Import errors**

Check your `components.json` aliases match your tsconfig paths.

**Missing dependencies**

Run the install command manually:
\`\`\`bash
npm install class-variance-authority clsx tailwind-merge
\`\`\`
