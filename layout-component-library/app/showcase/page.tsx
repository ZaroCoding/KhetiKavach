/**
 * Layout Showcase
 * Interactive demonstration of all available layout templates
 */

import { BentoGrid } from "@/components/layouts/bento-grid/bento-grid"
import { bentoPresets } from "@/components/layouts/bento-grid/presets"
import { SplitLayout } from "@/components/layouts/split/split-layout"
import { splitPresets } from "@/components/layouts/split/presets"
import { StackLayout } from "@/components/layouts/stack/stack-layout"
import { stackPresets } from "@/components/layouts/stack/presets"
import { ClusterLayout } from "@/components/layouts/cluster/cluster-layout"
import { clusterPresets } from "@/components/layouts/cluster/presets"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 space-y-4">
          <h1 className="text-balance text-4xl font-bold tracking-tight">Layout Template Library</h1>
          <p className="text-pretty text-xl text-muted-foreground">
            Production-ready layout templates. Never think about grids or flexbox again.
          </p>
          <div className="flex gap-2">
            <Link href="/">
              <Badge variant="outline">← Back to Demo</Badge>
            </Link>
          </div>
        </div>

        {/* Bento Grid Section */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Bento Grid</h2>
            <p className="text-muted-foreground">
              Asymmetric grid layouts with variable-sized cells. Perfect for dashboards and feature showcases.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Featured Preset</h3>
            <BentoGrid config={bentoPresets.featured}>
              {{
                hero: (
                  <Card className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">Hero Feature</h3>
                      <p className="mt-2">Large spotlight area</p>
                    </div>
                  </Card>
                ),
                feature1: (
                  <Card className="flex h-full items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 p-6 text-white">
                    <p className="font-semibold">Feature 1</p>
                  </Card>
                ),
                feature2: (
                  <Card className="flex h-full items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white">
                    <p className="font-semibold">Feature 2</p>
                  </Card>
                ),
                feature3: (
                  <Card className="flex h-full items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white">
                    <p className="font-semibold">Feature 3</p>
                  </Card>
                ),
                sidebar: (
                  <Card className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 p-6 text-white">
                    <p className="font-semibold">Sidebar</p>
                  </Card>
                ),
              }}
            </BentoGrid>
          </div>
        </section>

        {/* Split Layout Section */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Split Layout</h2>
            <p className="text-muted-foreground">
              Two-panel layouts with configurable ratios. Ideal for content and sidebar combinations.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">70/30 Content Sidebar</h3>
            <SplitLayout config={splitPresets.contentSidebar}>
              {{
                left: (
                  <Card className="h-64 p-6">
                    <h3 className="mb-2 text-xl font-bold">Main Content</h3>
                    <p className="text-muted-foreground">
                      Primary content area takes up 70% of the space. Automatically stacks on mobile.
                    </p>
                  </Card>
                ),
                right: (
                  <Card className="h-64 p-6">
                    <h3 className="mb-2 text-xl font-bold">Sidebar</h3>
                    <p className="text-muted-foreground">Secondary content in 30% sidebar.</p>
                  </Card>
                ),
              }}
            </SplitLayout>
          </div>
        </section>

        {/* Stack Layout Section */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Stack Layout</h2>
            <p className="text-muted-foreground">
              Simple vertical or horizontal stacking with consistent spacing. The foundation for most layouts.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Vertical Stack</h3>
              <StackLayout config={stackPresets.vertical}>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-4">
                    <p className="font-medium">Item {i}</p>
                  </Card>
                ))}
              </StackLayout>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Horizontal Stack</h3>
              <StackLayout config={stackPresets.horizontal}>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-4">
                    <p className="font-medium">Item {i}</p>
                  </Card>
                ))}
              </StackLayout>
            </div>
          </div>
        </section>

        {/* Cluster Layout Section */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Cluster Layout</h2>
            <p className="text-muted-foreground">
              Wrapping flexbox for tags, chips, and button groups. Handles overflow gracefully.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Tag Cluster</h3>
            <ClusterLayout config={clusterPresets.tags}>
              {[
                "React",
                "TypeScript",
                "Next.js",
                "Tailwind",
                "shadcn/ui",
                "Vercel",
                "Design Systems",
                "Components",
                "Layouts",
                "Responsive",
                "Accessible",
                "Production Ready",
              ].map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </ClusterLayout>
          </div>
        </section>

        {/* Composition Example */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Layout Composition</h2>
            <p className="text-muted-foreground">Layouts can be nested and composed together for complex interfaces.</p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Stack + Split + Cluster</h3>
            <StackLayout config={{ ...stackPresets.vertical, gap: 6 }}>
              <Card className="p-6">
                <h4 className="mb-4 text-lg font-bold">Header with Tags</h4>
                <ClusterLayout config={clusterPresets.tags}>
                  {["Featured", "New", "Popular"].map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </ClusterLayout>
              </Card>

              <SplitLayout config={splitPresets.equal}>
                {{
                  left: (
                    <Card className="h-48 p-6">
                      <h4 className="font-bold">Left Panel</h4>
                      <p className="mt-2 text-sm text-muted-foreground">Nested layouts compose naturally</p>
                    </Card>
                  ),
                  right: (
                    <Card className="h-48 p-6">
                      <h4 className="font-bold">Right Panel</h4>
                      <p className="mt-2 text-sm text-muted-foreground">Build complex UIs from simple primitives</p>
                    </Card>
                  ),
                }}
              </SplitLayout>
            </StackLayout>
          </div>
        </section>
      </div>
    </div>
  )
}
