"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/loading/skeleton/skeleton"
import {
  SkeletonCard,
  SkeletonListItem,
  SkeletonTableRow,
  SkeletonAvatar,
  SkeletonForm,
  SkeletonStats,
} from "@/components/loading/skeleton/presets"
import { Spinner, LoadingDots, LoadingPulse } from "@/components/loading/spinner/spinner"
import { AsyncContainer } from "@/components/loading/async-container/async-container"
import { ProgressiveLoader } from "@/components/loading/progressive/progressive-loader"
import type { AsyncState } from "@/lib/loading/types"

export default function LoadingShowcase() {
  const [asyncState, setAsyncState] = React.useState<AsyncState<string[], Error>>({ status: "idle" })
  const [progressiveLoading, setProgressiveLoading] = React.useState(false)

  const simulateLoading = () => {
    setAsyncState({ status: "loading" })
    setTimeout(() => {
      setAsyncState({
        status: "success",
        data: ["Item 1", "Item 2", "Item 3"],
      })
    }, 2000)
  }

  const simulateError = () => {
    setAsyncState({ status: "loading" })
    setTimeout(() => {
      setAsyncState({
        status: "error",
        error: new Error("Failed to load data"),
      })
    }, 1000)
  }

  const simulateProgressive = () => {
    setProgressiveLoading(true)
    setTimeout(() => {
      setProgressiveLoading(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Loading State System</h1>
          <p className="text-lg text-muted-foreground">
            Never write loading states from scratch again. Production-ready patterns for every scenario.
          </p>
        </div>

        {/* Skeleton Patterns */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Skeleton Patterns</h2>
            <p className="text-muted-foreground">Content-aware loading placeholders</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Card Skeleton</h3>
              <SkeletonCard />
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-medium">List Items</h3>
              <div className="space-y-4">
                <SkeletonListItem />
                <SkeletonListItem />
                <SkeletonListItem />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-medium">Avatar + Text</h3>
              <div className="space-y-4">
                <SkeletonAvatar />
                <SkeletonAvatar />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-medium">Table Rows</h3>
              <div className="space-y-3">
                <SkeletonTableRow columns={3} />
                <SkeletonTableRow columns={3} />
                <SkeletonTableRow columns={3} />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-medium">Form</h3>
              <SkeletonForm fields={3} />
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-medium">Custom</h3>
              <div className="space-y-3">
                <Skeleton height="60px" rounded="lg" />
                <Skeleton lines={3} />
                <div className="flex gap-2">
                  <Skeleton height="32px" width="80px" rounded="md" />
                  <Skeleton height="32px" width="80px" rounded="md" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 font-medium">Dashboard Stats</h3>
            <SkeletonStats count={4} />
          </Card>
        </section>

        {/* Spinner Variants */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Loading Indicators</h2>
            <p className="text-muted-foreground">Animated indicators for active loading</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-12">
              <Spinner size="lg" />
              <p className="mt-4 text-sm text-muted-foreground">Spinner</p>
            </Card>

            <Card className="flex flex-col items-center justify-center p-12">
              <LoadingDots size="lg" />
              <p className="mt-4 text-sm text-muted-foreground">Dots</p>
            </Card>

            <Card className="flex flex-col items-center justify-center p-12">
              <LoadingPulse size="lg" />
              <p className="mt-4 text-sm text-muted-foreground">Pulse</p>
            </Card>
          </div>
        </section>

        {/* Async Container */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Async Container</h2>
            <p className="text-muted-foreground">Handle all async states in one component</p>
          </div>

          <div className="flex gap-4">
            <Button onClick={simulateLoading}>Simulate Success</Button>
            <Button onClick={simulateError} variant="destructive">
              Simulate Error
            </Button>
          </div>

          <Card className="p-6">
            <AsyncContainer
              state={asyncState}
              loading={<SkeletonListItem />}
              empty={
                <div className="text-center">
                  <p className="text-muted-foreground">No items yet</p>
                  <Button className="mt-4" onClick={simulateLoading}>
                    Load Items
                  </Button>
                </div>
              }
            >
              {(data) => (
                <ul className="space-y-2">
                  {data.map((item, i) => (
                    <li key={i} className="rounded-lg border p-4">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </AsyncContainer>
          </Card>
        </section>

        {/* Progressive Loading */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Progressive Loading</h2>
            <p className="text-muted-foreground">Prevent flashing with smart delays and fade-ins</p>
          </div>

          <Button onClick={simulateProgressive}>Trigger Progressive Load</Button>

          <Card className="p-6">
            <ProgressiveLoader
              isLoading={progressiveLoading}
              fallback={<SkeletonCard />}
              delay={200}
              minDuration={500}
              fadeInDuration={300}
            >
              <div className="space-y-4">
                <div className="h-48 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5" />
                <h3 className="text-xl font-semibold">Content Loaded!</h3>
                <p className="text-muted-foreground">
                  This content faded in smoothly after the minimum loading duration.
                </p>
              </div>
            </ProgressiveLoader>
          </Card>
        </section>

        {/* Usage Examples */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Usage Examples</h2>
            <p className="text-muted-foreground">Copy-paste ready code snippets</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Basic Skeleton</h3>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                {`<Skeleton height="200px" />
<Skeleton lines={3} />
<Skeleton width="120px" />`}
              </pre>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-medium">Async Container</h3>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                {`<AsyncContainer
  state={asyncState}
  loading={<Spinner />}
>
  {(data) => <div>{data}</div>}
</AsyncContainer>`}
              </pre>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
