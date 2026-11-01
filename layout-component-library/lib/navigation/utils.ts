/**
 * Navigation utility functions
 */

import type { NavItem, NavGroup } from "./types"

/**
 * Check if a navigation item is a group
 */
export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item && Array.isArray(item.items)
}

/**
 * Find active item in navigation tree
 */
export function findActiveItem(items: (NavItem | NavGroup)[], currentPath: string): NavItem | null {
  for (const item of items) {
    if (isNavGroup(item)) {
      const found = findActiveItem(item.items, currentPath)
      if (found) return found
    } else {
      if (item.href === currentPath) return item
      if (item.children) {
        const found = findActiveItem(item.children, currentPath)
        if (found) return found
      }
    }
  }
  return null
}

/**
 * Get breadcrumb trail from navigation tree
 */
export function getBreadcrumbTrail(items: (NavItem | NavGroup)[], currentPath: string): NavItem[] {
  const trail: NavItem[] = []

  function search(items: (NavItem | NavGroup)[], path: NavItem[]): boolean {
    for (const item of items) {
      if (isNavGroup(item)) {
        if (search(item.items, path)) return true
      } else {
        const newPath = [...path, item]
        if (item.href === currentPath) {
          trail.push(...newPath)
          return true
        }
        if (item.children && search(item.children, newPath)) {
          return true
        }
      }
    }
    return false
  }

  search(items, [])
  return trail
}

/**
 * Calculate pagination range
 */
export function getPaginationRange(currentPage: number, totalPages: number, siblingCount = 1): (number | "ellipsis")[] {
  const totalNumbers = siblingCount * 2 + 3 // siblings + current + first + last
  const totalBlocks = totalNumbers + 2 // + 2 ellipsis

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
    return [...leftRange, "ellipsis", totalPages]
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount
    const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1)
    return [1, "ellipsis", ...rightRange]
  }

  const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i)
  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages]
}

/**
 * Generate navigation classes
 */
export function getNavClasses(variant: string, size: string, orientation: string): string {
  const baseClasses = "flex"

  const orientationClasses = {
    horizontal: "flex-row items-center",
    vertical: "flex-col",
  }

  const variantClasses = {
    default: "gap-1",
    pills: "gap-1",
    underline: "gap-4 border-b",
    sidebar: "gap-0.5",
    minimal: "gap-2",
  }

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return [
    baseClasses,
    orientationClasses[orientation as keyof typeof orientationClasses] || orientationClasses.horizontal,
    variantClasses[variant as keyof typeof variantClasses] || variantClasses.default,
    sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md,
  ].join(" ")
}
