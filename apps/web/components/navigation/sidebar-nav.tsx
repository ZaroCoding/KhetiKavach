"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  /** Route to navigate to. Items without an href are buttons that call onSelect. */
  href?: string;
  onSelect?: () => void;
}

const base =
  "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm transition-colors hover:bg-soil-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden";

function navItemClass(active: boolean | undefined): string {
  return cn(base, active ? "bg-soil-100 font-semibold text-leaf-700" : "text-soil-700");
}

interface SidebarNavProps {
  items: NavItem[];
  ariaLabel: string;
  className?: string;
}

/** Vertical navigation. Items either link to a route or switch an in-page view. */
export function SidebarNav({ items, ariaLabel, className }: SidebarNavProps) {
  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const content = (
          <>
            {item.icon && <span className="size-4 shrink-0 [&>svg]:size-4">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
          </>
        );
        return item.href ? (
          <Link key={item.id} href={item.href} className={navItemClass(item.active)} aria-current={item.active ? "page" : undefined}>
            {content}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            onClick={item.onSelect}
            className={navItemClass(item.active)}
            aria-current={item.active ? "page" : undefined}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
