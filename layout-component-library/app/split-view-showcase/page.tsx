"use client"

import { SplitView } from "@/components/layouts/split-view/split-view"
import { splitViewPresets } from "@/components/layouts/split-view/presets"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileType as FileTree, Code, Eye, Folder, Mail, Layers, Paintbrush, BookOpen, Database } from "lucide-react"

export default function SplitViewShowcase() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Split-View Application Layouts</h1>
          <p className="text-lg text-muted-foreground">
            Sophisticated multi-pane layouts with resizable, collapsible panels. Perfect for complex applications like
            IDEs, email clients, design tools, and more.
          </p>
        </div>

        {/* Features */}
        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-semibold">Features</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Resizable panels with drag handles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Collapsible side panels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>State persistence to localStorage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Min/max size constraints</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Fully accessible with ARIA labels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Type-safe configuration</span>
            </li>
          </ul>
        </Card>

        {/* Live Demos */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold">Live Demos</h2>

          {/* IDE Layout */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">IDE Layout</h3>
                  <p className="text-sm text-muted-foreground">File explorer + code editor + live preview</p>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              <SplitView config={splitViewPresets.ide}>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileTree className="h-4 w-4" />
                    <span className="font-medium">Files</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="pl-2">📁 src</div>
                    <div className="pl-4">📄 app.tsx</div>
                    <div className="pl-4">📄 index.tsx</div>
                    <div className="pl-2">📁 components</div>
                    <div className="pl-4">📄 Button.tsx</div>
                    <div className="pl-4">📄 Card.tsx</div>
                  </div>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Code className="h-4 w-4" />
                    <span className="font-medium">Editor</span>
                  </div>
                  <pre className="text-sm">
                    <code>{`export function Button() {
  return (
    <button className="btn">
      Click me
    </button>
  )
}`}</code>
                  </pre>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">Preview</span>
                  </div>
                  <div className="flex items-center justify-center h-32 border rounded">
                    <Button>Click me</Button>
                  </div>
                </Card>
              </SplitView>
            </div>
          </Card>

          {/* Email Layout */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Email Layout</h3>
                  <p className="text-sm text-muted-foreground">Folders + message list + message detail</p>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              <SplitView config={splitViewPresets.email}>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Folder className="h-4 w-4" />
                    <span className="font-medium">Folders</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">📥 Inbox (12)</div>
                    <div>📤 Sent</div>
                    <div>📝 Drafts (3)</div>
                    <div>⭐ Starred</div>
                    <div>🗑️ Trash</div>
                  </div>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Messages</span>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="border-b pb-2">
                        <div className="font-medium text-sm">Message Subject {i}</div>
                        <div className="text-xs text-muted-foreground">From: sender@example.com</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="font-semibold">Message Subject 1</div>
                      <div className="text-sm text-muted-foreground">From: sender@example.com</div>
                    </div>
                    <div className="text-sm">
                      <p>This is the message content. It would contain the full email body here.</p>
                    </div>
                  </div>
                </Card>
              </SplitView>
            </div>
          </Card>

          {/* Design Tool Layout */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Paintbrush className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Design Tool Layout</h3>
                  <p className="text-sm text-muted-foreground">Layers panel + canvas + properties inspector</p>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              <SplitView config={splitViewPresets.designTool}>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="h-4 w-4" />
                    <span className="font-medium">Layers</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>🔲 Frame 1</div>
                    <div className="pl-4">📦 Container</div>
                    <div className="pl-6">📝 Text</div>
                    <div className="pl-6">🖼️ Image</div>
                  </div>
                </Card>
                <Card className="h-full border-0 flex items-center justify-center bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <Paintbrush className="h-12 w-12 mx-auto mb-2" />
                    <p>Canvas Area</p>
                  </div>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-medium">Properties</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium mb-1">Position</div>
                      <div className="text-muted-foreground">X: 100, Y: 200</div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Size</div>
                      <div className="text-muted-foreground">W: 300, H: 200</div>
                    </div>
                  </div>
                </Card>
              </SplitView>
            </div>
          </Card>

          {/* Documentation Layout */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Documentation Layout</h3>
                  <p className="text-sm text-muted-foreground">Table of contents + content + on-this-page navigation</p>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              <SplitView config={splitViewPresets.docs}>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">Contents</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">Getting Started</div>
                    <div className="pl-2">Installation</div>
                    <div className="pl-2">Quick Start</div>
                    <div className="font-medium mt-3">Components</div>
                    <div className="pl-2">Layouts</div>
                    <div className="pl-2">Navigation</div>
                  </div>
                </Card>
                <Card className="h-full border-0 p-6 overflow-auto">
                  <h1 className="text-2xl font-bold mb-4">Getting Started</h1>
                  <p className="mb-4">Welcome to the documentation. This is the main content area.</p>
                  <h2 className="text-xl font-semibold mb-2">Installation</h2>
                  <p className="mb-4">Follow these steps to install...</p>
                  <h2 className="text-xl font-semibold mb-2">Quick Start</h2>
                  <p>Get up and running quickly...</p>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-medium text-sm">On This Page</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-primary">Getting Started</div>
                    <div className="pl-2">Installation</div>
                    <div className="pl-2">Quick Start</div>
                  </div>
                </Card>
              </SplitView>
            </div>
          </Card>

          {/* Data Explorer Layout */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Data Explorer Layout</h3>
                  <p className="text-sm text-muted-foreground">Schema browser + query editor + results viewer</p>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              <SplitView config={splitViewPresets.dataExplorer}>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">Schema</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>📊 users</div>
                    <div className="pl-4 text-muted-foreground">id, name, email</div>
                    <div>📊 posts</div>
                    <div className="pl-4 text-muted-foreground">id, title, content</div>
                  </div>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Code className="h-4 w-4" />
                    <span className="font-medium">Query</span>
                  </div>
                  <pre className="text-sm">
                    <code>{`SELECT * FROM users
WHERE email LIKE '%@example.com'
LIMIT 10;`}</code>
                  </pre>
                </Card>
                <Card className="h-full border-0 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-medium">Results</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-mono">10 rows returned</div>
                  </div>
                </Card>
              </SplitView>
            </div>
          </Card>
        </div>

        {/* Usage Guide */}
        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-semibold">Usage</h2>
          <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
            <code>{`import { SplitView } from "@/components/layouts/split-view/split-view"
import { splitViewPresets } from "@/components/layouts/split-view/presets"

<SplitView config={splitViewPresets.ide}>
  <div>Sidebar content</div>
  <div>Editor content</div>
  <div>Preview content</div>
</SplitView>`}</code>
          </pre>
        </Card>
      </div>
    </div>
  )
}
