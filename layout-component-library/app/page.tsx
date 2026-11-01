import { FeatureSection } from "@/components/sections/features/feature-section"
import { CTASection } from "@/components/sections/cta/cta-section"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LayoutGrid, Loader2, Layers, Navigation, SplitSquareVertical, Blocks, Code2, Sparkles } from "lucide-react"
import { TemplatePreview3D } from "./components/template-preview-3d"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative h-[700px] overflow-hidden border-b bg-gradient-to-b from-background to-muted/20">
        {/* 3D Preview - positioned absolutely behind content */}
        <div className="absolute inset-0">
          <TemplatePreview3D />
        </div>

        {/* Hero content - positioned above 3D preview */}
        <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6" variant="secondary">
              Production Ready
            </Badge>
            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Never Think About Layouts Again
            </h1>
            <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">
              A comprehensive library of production-ready layout templates. Modular, composable, and built to scale to
              thousands.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/composition-examples">
                <Button size="lg">Explore All Systems</Button>
              </Link>
              <Link href="/builder">
                <Button size="lg" variant="outline">
                  Try Layout Builder
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-chart-1/5 blur-3xl" />
      </section>

      <FeatureSection
        title="Complete Layout Ecosystem"
        description="Six integrated systems that work together seamlessly"
        variant="cards"
        columns={3}
        padding="xl"
        background="muted"
        features={[
          {
            icon: <LayoutGrid className="h-6 w-6" />,
            title: "Layout Templates",
            description:
              "Bento grids, sidebars, splits, stacks, and clusters. Every spatial arrangement pattern you need.",
          },
          {
            icon: <Loader2 className="h-6 w-6" />,
            title: "Loading States",
            description:
              "Skeletons, spinners, async containers, and progressive loaders. Handle every loading scenario.",
          },
          {
            icon: <Layers className="h-6 w-6" />,
            title: "Page Shells",
            description: "App, marketing, dashboard, docs, and auth shells. Complete page structures ready to use.",
          },
          {
            icon: <Navigation className="h-6 w-6" />,
            title: "Navigation Patterns",
            description:
              "Top nav, sidebar nav, mobile nav, breadcrumbs, tabs, and pagination. Every nav pattern covered.",
          },
          {
            icon: <SplitSquareVertical className="h-6 w-6" />,
            title: "Split-View Layouts",
            description:
              "IDE, email, design tool, docs, and data explorer layouts. Resizable, collapsible multi-pane interfaces.",
          },
          {
            icon: <Blocks className="h-6 w-6" />,
            title: "Section Patterns",
            description: "Hero, features, pricing, and CTA sections. Pre-built content blocks for marketing pages.",
          },
        ]}
      />

      <section className="container mx-auto px-4 py-24">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Explore Interactive Showcases
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            See every component in action with live examples and code snippets
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/showcase" className="group">
            <Card className="h-full transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <CardTitle className="group-hover:text-primary">Layout Templates</CardTitle>
                <CardDescription>5 core layouts with 15+ presets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Bento Grid</Badge>
                  <Badge variant="secondary">Sidebar</Badge>
                  <Badge variant="secondary">Split</Badge>
                  <Badge variant="secondary">Stack</Badge>
                  <Badge variant="secondary">Cluster</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/loading-showcase" className="group">
            <Card className="h-full transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                  <Loader2 className="h-6 w-6" />
                </div>
                <CardTitle className="group-hover:text-primary">Loading States</CardTitle>
                <CardDescription>Handle every async scenario</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Skeletons</Badge>
                  <Badge variant="secondary">Spinners</Badge>
                  <Badge variant="secondary">Async Container</Badge>
                  <Badge variant="secondary">Progressive</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shells-showcase" className="group">
            <Card className="h-full transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                  <Layers className="h-6 w-6" />
                </div>
                <CardTitle className="group-hover:text-primary">Page Shells</CardTitle>
                <CardDescription>Complete page structures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">App</Badge>
                  <Badge variant="secondary">Marketing</Badge>
                  <Badge variant="secondary">Dashboard</Badge>
                  <Badge variant="secondary">Docs</Badge>
                  <Badge variant="secondary">Auth</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/navigation-showcase" className="group">
            <Card className="h-full transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                  <Navigation className="h-6 w-6" />
                </div>
                <CardTitle className="group-hover:text-primary">Navigation Patterns</CardTitle>
                <CardDescription>Every nav pattern you need</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Top Nav</Badge>
                  <Badge variant="secondary">Sidebar Nav</Badge>
                  <Badge variant="secondary">Mobile Nav</Badge>
                  <Badge variant="secondary">Breadcrumbs</Badge>
                  <Badge variant="secondary">Tabs</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/split-view-showcase" className="group">
            <Card className="h-full transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
                  <SplitSquareVertical className="h-6 w-6" />
                </div>
                <CardTitle className="group-hover:text-primary">Split-View Layouts</CardTitle>
                <CardDescription>Multi-pane application interfaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">IDE</Badge>
                  <Badge variant="secondary">Email</Badge>
                  <Badge variant="secondary">Design Tool</Badge>
                  <Badge variant="secondary">Docs</Badge>
                  <Badge variant="secondary">Data Explorer</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/sections-showcase" className="group">
            <Card className="h-full transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
                  <Blocks className="h-6 w-6" />
                </div>
                <CardTitle className="group-hover:text-primary">Section Patterns</CardTitle>
                <CardDescription>Pre-built content sections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Hero</Badge>
                  <Badge variant="secondary">Features</Badge>
                  <Badge variant="secondary">Pricing</Badge>
                  <Badge variant="secondary">CTA</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-24">
          <div className="mb-12 text-center">
            <div className="mb-4 flex justify-center">
              <Badge variant="secondary" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Composable Architecture
              </Badge>
            </div>
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Everything Works Together
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
              Shells provide structure, navigation fills slots, layouts arrange content, and loading states handle async
              data. All type-safe and fully composable.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Composition Example
                </CardTitle>
                <CardDescription>How the systems compose together</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                  <code>{`<AppShell>
  <AppShell.Header>
    <TopNav items={navItems} />
  </AppShell.Header>
  
  <AppShell.Sidebar>
    <SidebarNav items={sidebarItems} />
  </AppShell.Sidebar>
  
  <AppShell.Main>
    <BentoGrid preset="featured">
      {{
        hero: (
          <AsyncContainer state={dataState}>
            <DashboardCard />
          </AsyncContainer>
        ),
        // ... more slots
      }}
    </BentoGrid>
  </AppShell.Main>
</AppShell>`}</code>
                </pre>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <Link href="/composition-examples">
                <Button size="lg" variant="outline">
                  View Full Composition Guide →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FeatureSection
        title="Built for Scale"
        description="Enterprise-grade architecture that grows with your team"
        variant="grid"
        columns={3}
        padding="xl"
        features={[
          {
            icon: <span className="text-2xl">🧩</span>,
            title: "Modular",
            description:
              "Each component is isolated in its own module. Multiple engineers can work simultaneously without conflicts.",
          },
          {
            icon: <span className="text-2xl">🔒</span>,
            title: "Type Safe",
            description:
              "Comprehensive TypeScript types with no unsafe casting. Strong inference and clear contracts between components.",
          },
          {
            icon: <span className="text-2xl">♿</span>,
            title: "Accessible",
            description:
              "Semantic HTML, ARIA labels, and proper landmark regions built in. Accessibility is a core requirement.",
          },
          {
            icon: <span className="text-2xl">📱</span>,
            title: "Responsive",
            description:
              "Mobile-first responsive behavior built into every layout. Breakpoint-specific configurations with sensible defaults.",
          },
          {
            icon: <span className="text-2xl">🎨</span>,
            title: "Composable",
            description:
              "Layouts nest and compose naturally. Build complex interfaces from simple, reusable primitives.",
          },
          {
            icon: <span className="text-2xl">⚡</span>,
            title: "Zero Dependencies",
            description:
              "Pure React and Tailwind CSS. No external layout libraries or frameworks required. Complete control over your code.",
          },
        ]}
      />

      <CTASection
        variant="centered"
        background="gradient"
        content={{
          heading: "Ready to Build?",
          description:
            "Explore the full showcase to see every layout template in action with interactive examples and code snippets.",
          primaryCTA: {
            label: "Explore All Systems",
            href: "/showcase",
          },
          secondaryCTA: {
            label: "View on GitHub",
            href: "https://github.com",
          },
        }}
      />
    </main>
  )
}
