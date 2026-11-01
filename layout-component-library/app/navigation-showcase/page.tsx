"use client"

import { useState } from "react"
import { TopNav } from "@/components/navigation/top-nav/top-nav"
import { SidebarNav } from "@/components/navigation/sidebar-nav/sidebar-nav"
import { MobileNav } from "@/components/navigation/mobile-nav/mobile-nav"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs/breadcrumbs"
import { Tabs } from "@/components/navigation/tabs/tabs"
import { Pagination } from "@/components/navigation/pagination/pagination"
import type { NavItem, NavGroup } from "@/lib/navigation/types"

export default function NavigationShowcase() {
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState("overview")

  // Sample navigation items
  const navItems: (NavItem | NavGroup)[] = [
    { id: "home", label: "Home", href: "/", active: false },
    { id: "about", label: "About", href: "/about", active: false },
    {
      id: "products-group",
      label: "Products",
      items: [
        { id: "all-products", label: "All Products", href: "/products", icon: "📦" },
        { id: "featured", label: "Featured", href: "/products/featured", icon: "⭐", badge: "New" },
        { id: "on-sale", label: "On Sale", href: "/products/sale", icon: "🏷️", badge: 12 },
      ],
    },
    { id: "docs", label: "Documentation", href: "/docs", active: true },
    { id: "contact", label: "Contact", href: "/contact", badge: 3 },
  ]

  const sidebarItems: (NavItem | NavGroup)[] = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "📊", active: true },
    { id: "analytics", label: "Analytics", href: "/analytics", icon: "📈", badge: "Pro" },
    {
      id: "content-group",
      label: "Content",
      items: [
        { id: "posts", label: "Posts", href: "/posts", icon: "📝", badge: 24 },
        { id: "pages", label: "Pages", href: "/pages", icon: "📄" },
        { id: "media", label: "Media", href: "/media", icon: "🖼️" },
      ],
    },
    {
      id: "settings-group",
      label: "Settings",
      items: [
        { id: "general", label: "General", href: "/settings/general", icon: "⚙️" },
        { id: "security", label: "Security", href: "/settings/security", icon: "🔒" },
        { id: "billing", label: "Billing", href: "/settings/billing", icon: "💳" },
      ],
    },
  ]

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Electronics", href: "/products/electronics" },
    { label: "Laptops", current: true },
  ]

  const tabItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: "📋" },
    { id: "analytics", label: "Analytics", icon: "📊", badge: "New" },
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Navigation System</h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive navigation patterns for every use case. Never write nav code from scratch again.
          </p>
        </div>

        {/* Top Navigation */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Top Navigation</h2>
            <p className="text-muted-foreground">Horizontal navigation bars with dropdown support</p>
          </div>

          <div className="space-y-6 rounded-lg border bg-card p-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Default Variant</h3>
              <TopNav config={{ items: navItems, variant: "default" }} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Pills Variant</h3>
              <TopNav config={{ items: navItems, variant: "pills" }} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Underline Variant</h3>
              <TopNav config={{ items: navItems, variant: "underline" }} />
            </div>
          </div>
        </section>

        {/* Sidebar Navigation */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Sidebar Navigation</h2>
            <p className="text-muted-foreground">Vertical navigation with collapsible groups</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Accordion Behavior</h3>
              <SidebarNav config={{ items: sidebarItems, collapseBehavior: "accordion" }} />
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Independent Behavior</h3>
              <SidebarNav config={{ items: sidebarItems, collapseBehavior: "independent" }} />
            </div>
          </div>
        </section>

        {/* Mobile Navigation */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Mobile Navigation</h2>
            <p className="text-muted-foreground">Responsive drawer navigation for mobile devices</p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex gap-4">
              <MobileNav config={{ items: sidebarItems, position: "left" }} />
              <span className="text-sm text-muted-foreground">Left Drawer</span>

              <MobileNav config={{ items: sidebarItems, position: "right" }} />
              <span className="text-sm text-muted-foreground">Right Drawer</span>
            </div>
          </div>
        </section>

        {/* Breadcrumbs */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Breadcrumbs</h2>
            <p className="text-muted-foreground">Path navigation showing current location</p>
          </div>

          <div className="space-y-4 rounded-lg border bg-card p-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Default Separator</h3>
              <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Custom Separator</h3>
              <Breadcrumbs items={breadcrumbItems} separator={<span className="text-muted-foreground">/</span>} />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Tabs</h2>
            <p className="text-muted-foreground">Tabbed navigation with multiple variants</p>
          </div>

          <div className="space-y-6 rounded-lg border bg-card p-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Underline Tabs</h3>
              <Tabs config={{ items: tabItems, activeTab, onTabChange: setActiveTab, variant: "underline" }} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Pills Tabs</h3>
              <Tabs config={{ items: tabItems, activeTab, onTabChange: setActiveTab, variant: "pills" }} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Enclosed Tabs</h3>
              <Tabs config={{ items: tabItems, activeTab, onTabChange: setActiveTab, variant: "enclosed" }} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Soft Tabs</h3>
              <Tabs config={{ items: tabItems, activeTab, onTabChange: setActiveTab, variant: "soft" }} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Full Width Tabs</h3>
              <Tabs
                config={{
                  items: tabItems,
                  activeTab,
                  onTabChange: setActiveTab,
                  variant: "underline",
                  fullWidth: true,
                }}
              />
            </div>
          </div>
        </section>

        {/* Pagination */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Pagination</h2>
            <p className="text-muted-foreground">Page navigation with numbered buttons</p>
          </div>

          <div className="space-y-6 rounded-lg border bg-card p-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Default Pagination</h3>
              <Pagination
                config={{
                  currentPage,
                  totalPages: 10,
                  onPageChange: setCurrentPage,
                  variant: "default",
                }}
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Simple Pagination</h3>
              <Pagination
                config={{
                  currentPage,
                  totalPages: 10,
                  onPageChange: setCurrentPage,
                  variant: "simple",
                  showFirstLast: false,
                }}
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Compact Pagination</h3>
              <Pagination
                config={{
                  currentPage,
                  totalPages: 10,
                  onPageChange: setCurrentPage,
                  variant: "compact",
                }}
              />
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Architecture Highlights</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Type-Safe</h3>
              <p className="text-sm text-muted-foreground">
                Fully typed navigation items, groups, and configurations with TypeScript
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Accessible</h3>
              <p className="text-sm text-muted-foreground">
                ARIA labels, keyboard navigation, and screen reader support built-in
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Responsive</h3>
              <p className="text-sm text-muted-foreground">
                Mobile-optimized with drawer navigation and touch-friendly interactions
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Composable</h3>
              <p className="text-sm text-muted-foreground">
                Mix and match navigation patterns to build complex navigation systems
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Customizable</h3>
              <p className="text-sm text-muted-foreground">
                Multiple variants, sizes, and behaviors for every navigation pattern
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 font-semibold">Production-Ready</h3>
              <p className="text-sm text-muted-foreground">
                Battle-tested patterns with proper state management and edge case handling
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
