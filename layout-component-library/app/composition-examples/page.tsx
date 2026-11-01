/**
 * Composition Examples
 * Demonstrates how shells, navigation, layouts, and loading states compose together
 */

"use client"

import { CompositionProvider } from "@/lib/composition/context"
import { AppShell } from "@/components/shells/app-shell/app-shell"
import { MarketingShell } from "@/components/shells/marketing-shell/marketing-shell"
import { TopNav } from "@/components/navigation/top-nav/top-nav"
import { SidebarNav } from "@/components/navigation/sidebar-nav/sidebar-nav"
import { BentoGrid } from "@/components/layouts/bento-grid/bento-grid"
import { Stack } from "@/components/layouts/stack/stack-layout"
import { AsyncContainer } from "@/components/loading/async-container/async-container"
import { Card } from "@/components/ui/card"
import { useState } from "react"

export default function CompositionExamplesPage() {
  const [activeExample, setActiveExample] = useState<"app" | "marketing">("app")

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Composition Examples</h1>
          <p className="text-lg text-muted-foreground">
            See how shells, navigation, layouts, and loading states compose together
          </p>
        </div>

        {/* Example Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveExample("app")}
            className={`rounded-md px-4 py-2 ${activeExample === "app" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            App Shell Example
          </button>
          <button
            onClick={() => setActiveExample("marketing")}
            className={`rounded-md px-4 py-2 ${activeExample === "marketing" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Marketing Shell Example
          </button>
        </div>

        {/* Examples */}
        <div className="space-y-12">
          {activeExample === "app" && <AppShellExample />}
          {activeExample === "marketing" && <MarketingShellExample />}
        </div>

        {/* Code Examples */}
        <CodeExamples />
      </div>
    </div>
  )
}

function AppShellExample() {
  const sidebarNavConfig = {
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", active: true, icon: "📊" },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: "📈" },
      {
        id: "settings",
        label: "Settings",
        items: [
          { id: "profile", label: "Profile", href: "/settings/profile", icon: "👤" },
          { id: "billing", label: "Billing", href: "/settings/billing", icon: "💳" },
        ],
      },
    ],
  }

  const topNavConfig = {
    items: [
      { id: "search", label: "Search", icon: "🔍" },
      { id: "notifications", label: "Notifications", badge: "3", icon: "🔔" },
      { id: "profile", label: "Profile", icon: "👤" },
    ],
    variant: "minimal" as const,
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-[600px]">
        <CompositionProvider>
          <AppShell>
            <AppShell.Header>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">My App</h2>
                <TopNav config={topNavConfig} />
              </div>
            </AppShell.Header>

            <AppShell.Sidebar>
              <SidebarNav config={sidebarNavConfig} />
            </AppShell.Sidebar>

            <AppShell.Main>
              <AsyncContainer
                state="success"
                loadingComponent={<div>Loading dashboard...</div>}
                errorComponent={<div>Error loading dashboard</div>}
                emptyComponent={<div>No data available</div>}
              >
                <Stack spacing="lg">
                  <h1 className="text-3xl font-bold">Dashboard</h1>
                  <BentoGrid
                    config={{
                      columns: 12,
                      gap: "md",
                      slots: [
                        { id: "stats", span: { cols: 12, rows: 1 } },
                        { id: "chart1", span: { cols: 8, rows: 2 } },
                        { id: "chart2", span: { cols: 4, rows: 2 } },
                      ],
                    }}
                  >
                    <Card className="p-6">
                      <h3 className="font-semibold">Stats Overview</h3>
                    </Card>
                    <Card className="p-6">
                      <h3 className="font-semibold">Revenue Chart</h3>
                    </Card>
                    <Card className="p-6">
                      <h3 className="font-semibold">Activity</h3>
                    </Card>
                  </BentoGrid>
                </Stack>
              </AsyncContainer>
            </AppShell.Main>
          </AppShell>
        </CompositionProvider>
      </div>
    </Card>
  )
}

function MarketingShellExample() {
  const navConfig = {
    items: [
      { id: "features", label: "Features", href: "#features" },
      { id: "pricing", label: "Pricing", href: "#pricing" },
      { id: "about", label: "About", href: "#about" },
      { id: "contact", label: "Contact", href: "#contact" },
    ],
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-[600px] overflow-y-auto">
        <MarketingShell headerStyle="blur" stickyHeader>
          <MarketingShell.Nav>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Brand</h2>
              <TopNav config={navConfig} />
            </div>
          </MarketingShell.Nav>

          <MarketingShell.Hero>
            <div className="flex min-h-[400px] items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="text-center">
                <h1 className="text-5xl font-bold">Welcome to Our Product</h1>
                <p className="mt-4 text-xl text-muted-foreground">The best solution for your needs</p>
              </div>
            </div>
          </MarketingShell.Hero>

          <MarketingShell.Main>
            <div className="mx-auto max-w-7xl space-y-16 px-4 py-16">
              <BentoGrid
                config={{
                  columns: 12,
                  gap: "lg",
                  slots: [
                    { id: "feature1", span: { cols: 6, rows: 2 } },
                    { id: "feature2", span: { cols: 6, rows: 2 } },
                    { id: "feature3", span: { cols: 12, rows: 1 } },
                  ],
                }}
              >
                <Card className="p-8">
                  <h3 className="text-2xl font-bold">Feature One</h3>
                  <p className="mt-2 text-muted-foreground">Amazing capabilities</p>
                </Card>
                <Card className="p-8">
                  <h3 className="text-2xl font-bold">Feature Two</h3>
                  <p className="mt-2 text-muted-foreground">Incredible performance</p>
                </Card>
                <Card className="p-8">
                  <h3 className="text-2xl font-bold">Feature Three</h3>
                  <p className="mt-2 text-muted-foreground">Seamless integration</p>
                </Card>
              </BentoGrid>
            </div>
          </MarketingShell.Main>

          <MarketingShell.Footer>
            <div className="text-center text-sm text-muted-foreground">© 2025 Brand. All rights reserved.</div>
          </MarketingShell.Footer>
        </MarketingShell>
      </div>
    </Card>
  )
}

function CodeExamples() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-bold">How It Works</h2>
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-2 font-semibold">1. Wrap with CompositionProvider (optional)</h3>
            <p className="text-sm text-muted-foreground">
              Provides shared state for mobile menu, sidebar, and active routes across all composed components.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">2. Use Shell with Compound Components</h3>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-4 text-sm">
              {`<AppShell>
  <AppShell.Header>
    <TopNav config={navConfig} />
  </AppShell.Header>
  <AppShell.Sidebar>
    <SidebarNav config={sidebarConfig} />
  </AppShell.Sidebar>
  <AppShell.Main>
    {/* Your content here */}
  </AppShell.Main>
</AppShell>`}
            </pre>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">3. Compose Layouts Inside Main</h3>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-4 text-sm">
              {`<AppShell.Main>
  <BentoGrid config={gridConfig}>
    <Card>Content 1</Card>
    <Card>Content 2</Card>
  </BentoGrid>
</AppShell.Main>`}
            </pre>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">4. Wrap with Loading States</h3>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-4 text-sm">
              {`<AsyncContainer state={loadingState}>
  <BentoGrid config={gridConfig}>
    {/* Content */}
  </BentoGrid>
</AsyncContainer>`}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  )
}
