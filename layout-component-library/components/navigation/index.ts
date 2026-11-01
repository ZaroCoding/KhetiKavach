/**
 * Navigation barrel export
 * All navigation components in one place
 */

// Top Navigation
export { TopNav } from "./top-nav/top-nav"
export type { TopNavProps } from "./top-nav/top-nav"

// Sidebar Navigation
export { SidebarNav } from "./sidebar-nav/sidebar-nav"
export type { SidebarNavProps } from "./sidebar-nav/sidebar-nav"

// Mobile Navigation
export { MobileNav } from "./mobile-nav/mobile-nav"
export type { MobileNavProps } from "./mobile-nav/mobile-nav"

// Breadcrumbs
export { Breadcrumbs } from "./breadcrumbs/breadcrumbs"
export type { BreadcrumbsProps } from "./breadcrumbs/breadcrumbs"

// Tabs
export { Tabs } from "./tabs/tabs"
export type { TabsProps } from "./tabs/tabs"

// Pagination
export { Pagination } from "./pagination/pagination"
export type { PaginationProps } from "./pagination/pagination"

// Types
export type { NavConfig, NavItem, NavGroup, BreadcrumbItem, TabConfig, PaginationConfig } from "@/lib/navigation/types"
