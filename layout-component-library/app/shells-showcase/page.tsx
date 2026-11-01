"use client"

import { AppShell } from "@/components/shells/app-shell/app-shell"
import { MarketingShell } from "@/components/shells/marketing-shell/marketing-shell"
import { DashboardShell } from "@/components/shells/dashboard-shell/dashboard-shell"
import { DocsShell } from "@/components/shells/docs-shell/docs-shell"
import { AuthShell } from "@/components/shells/auth-shell/auth-shell"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useState } from "react"

export default function ShellsShowcase() {
  const [activeShell, setActiveShell] = useState<string | null>(null)

  if (activeShell === "app") {
    return (
      <AppShell sidebarWidth={280} collapsedWidth={64} headerHeight={64}>
        <AppShell.Header>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">My SaaS App</div>
            </div>
            <Button variant="ghost" onClick={() => setActiveShell(null)}>
              Back to Showcase
            </Button>
          </div>
        </AppShell.Header>
        <AppShell.Sidebar>
          <nav className="space-y-2">
            <div className="font-semibold text-sm text-muted-foreground mb-2">Navigation</div>
            <Button variant="ghost" className="w-full justify-start">
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Projects
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Team
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Settings
            </Button>
          </nav>
        </AppShell.Sidebar>
        <AppShell.Main>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to your app dashboard</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="text-2xl font-bold">1,234</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </Card>
              <Card className="p-6">
                <div className="text-2xl font-bold">$12,345</div>
                <div className="text-sm text-muted-foreground">Revenue</div>
              </Card>
              <Card className="p-6">
                <div className="text-2xl font-bold">98%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </Card>
            </div>
          </div>
        </AppShell.Main>
        <AppShell.Footer>
          <div className="text-sm text-muted-foreground">© 2025 My SaaS App</div>
        </AppShell.Footer>
      </AppShell>
    )
  }

  if (activeShell === "marketing") {
    return (
      <MarketingShell headerStyle="blur" stickyHeader={true} maxWidth="2xl">
        <MarketingShell.Nav>
          <div className="flex w-full items-center justify-between">
            <div className="text-xl font-bold">Brand</div>
            <div className="flex items-center gap-4">
              <Button variant="ghost">Features</Button>
              <Button variant="ghost">Pricing</Button>
              <Button variant="ghost" onClick={() => setActiveShell(null)}>
                Back
              </Button>
            </div>
          </div>
        </MarketingShell.Nav>
        <MarketingShell.Hero>
          <div className="bg-gradient-to-b from-muted/50 to-background py-24 text-center">
            <h1 className="text-5xl font-bold mb-4">Welcome to Our Product</h1>
            <p className="text-xl text-muted-foreground mb-8">The best solution for your needs</p>
            <Button size="lg">Get Started</Button>
          </div>
        </MarketingShell.Hero>
        <MarketingShell.Main>
          <div className="space-y-24 py-24">
            <section className="text-center">
              <h2 className="text-3xl font-bold mb-4">Features</h2>
              <div className="grid gap-8 md:grid-cols-3 mt-12">
                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Fast</h3>
                  <p className="text-sm text-muted-foreground">Lightning fast performance</p>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Secure</h3>
                  <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Scalable</h3>
                  <p className="text-sm text-muted-foreground">Grows with your business</p>
                </Card>
              </div>
            </section>
          </div>
        </MarketingShell.Main>
        <MarketingShell.Footer>
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="font-semibold mb-4">Product</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Features</div>
                <div>Pricing</div>
                <div>FAQ</div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-4">Company</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>About</div>
                <div>Blog</div>
                <div>Careers</div>
              </div>
            </div>
          </div>
        </MarketingShell.Footer>
      </MarketingShell>
    )
  }

  if (activeShell === "dashboard") {
    return (
      <DashboardShell
        config={{ showBreadcrumbs: true, contentPadding: "md" }}
        children={{
          header: (
            <div className="flex w-full items-center justify-between">
              <div className="font-semibold">Analytics Dashboard</div>
              <Button variant="ghost" onClick={() => setActiveShell(null)}>
                Back
              </Button>
            </div>
          ),
          sidebar: (
            <nav className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Overview
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Analytics
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Reports
              </Button>
            </nav>
          ),
          breadcrumbs: <div className="text-muted-foreground">Home / Dashboard / Analytics</div>,
          main: (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Metric {i + 1}</div>
                  <div className="text-2xl font-bold">{Math.floor(Math.random() * 10000)}</div>
                </Card>
              ))}
            </div>
          ),
        }}
      />
    )
  }

  if (activeShell === "docs") {
    return (
      <DocsShell
        config={{ showAside: true }}
        children={{
          header: (
            <div className="flex w-full items-center justify-between">
              <div className="text-lg font-semibold">Documentation</div>
              <Button variant="ghost" onClick={() => setActiveShell(null)}>
                Back
              </Button>
            </div>
          ),
          sidebar: (
            <nav className="space-y-4">
              <div>
                <div className="font-semibold text-sm mb-2">Getting Started</div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground hover:text-foreground cursor-pointer">Introduction</div>
                  <div className="text-muted-foreground hover:text-foreground cursor-pointer">Installation</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-sm mb-2">Components</div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground hover:text-foreground cursor-pointer">Button</div>
                  <div className="text-muted-foreground hover:text-foreground cursor-pointer">Card</div>
                </div>
              </div>
            </nav>
          ),
          main: (
            <article className="prose prose-neutral dark:prose-invert max-w-none">
              <h1>Getting Started</h1>
              <p>Welcome to our documentation. This guide will help you get started with our product.</p>
              <h2>Installation</h2>
              <p>Install the package using your preferred package manager:</p>
              <pre>npm install our-package</pre>
              <h2>Usage</h2>
              <p>Import and use the components in your application:</p>
              <pre>import Component from 'our-package'</pre>
            </article>
          ),
          aside: (
            <nav className="space-y-2">
              <div className="font-semibold text-sm mb-2">On this page</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="hover:text-foreground cursor-pointer">Installation</div>
                <div className="hover:text-foreground cursor-pointer">Usage</div>
                <div className="hover:text-foreground cursor-pointer">Examples</div>
              </div>
            </nav>
          ),
        }}
      />
    )
  }

  if (activeShell === "auth") {
    return (
      <AuthShell
        config={{ backgroundStyle: "pattern", elevation: "md" }}
        children={{
          logo: <div className="text-2xl font-bold">Brand</div>,
          main: (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Enter your credentials to sign in</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" className="w-full rounded-md border px-3 py-2" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <input type="password" className="w-full rounded-md border px-3 py-2" placeholder="••••••••" />
                </div>
                <Button className="w-full">Sign In</Button>
              </div>
              <div className="text-center">
                <Button variant="ghost" onClick={() => setActiveShell(null)}>
                  Back to Showcase
                </Button>
              </div>
            </div>
          ),
          footer: (
            <div>
              Don't have an account? <span className="font-medium cursor-pointer">Sign up</span>
            </div>
          ),
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold">Page Shells</h1>
          <p className="text-xl text-muted-foreground">Complete page structures ready to use</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">App Shell</h3>
              <p className="text-sm text-muted-foreground">Classic SaaS application layout with sidebar and top bar</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Collapsible sidebar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Responsive mobile menu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Optional footer</span>
              </div>
            </div>
            <Button onClick={() => setActiveShell("app")} className="w-full">
              View Demo
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Marketing Shell</h3>
              <p className="text-sm text-muted-foreground">Landing page structure with hero and sections</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Sticky header options</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Hero section slot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Footer with columns</span>
              </div>
            </div>
            <Button onClick={() => setActiveShell("marketing")} className="w-full">
              View Demo
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Dashboard Shell</h3>
              <p className="text-sm text-muted-foreground">Data-heavy interface for metrics and charts</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Compact header</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Breadcrumb navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Flexible padding</span>
              </div>
            </div>
            <Button onClick={() => setActiveShell("dashboard")} className="w-full">
              View Demo
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Docs Shell</h3>
              <p className="text-sm text-muted-foreground">Documentation layout with table of contents</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Left sidebar TOC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Right sidebar (on page)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Constrained content width</span>
              </div>
            </div>
            <Button onClick={() => setActiveShell("docs")} className="w-full">
              View Demo
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Auth Shell</h3>
              <p className="text-sm text-muted-foreground">Centered card layout for authentication</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Multiple backgrounds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Logo slot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Footer links</span>
              </div>
            </div>
            <Button onClick={() => setActiveShell("auth")} className="w-full">
              View Demo
            </Button>
          </Card>
        </div>

        <Card className="p-8 space-y-4">
          <h2 className="text-2xl font-bold">Architecture Highlights</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Modular Design</h3>
              <p className="text-sm text-muted-foreground">
                Each shell is isolated with its own types, presets, and configuration
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Type-Safe</h3>
              <p className="text-sm text-muted-foreground">Full TypeScript support with no unsafe casting</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Responsive</h3>
              <p className="text-sm text-muted-foreground">Mobile-first with intelligent breakpoint handling</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Composable</h3>
              <p className="text-sm text-muted-foreground">Works seamlessly with layout templates and loading states</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
