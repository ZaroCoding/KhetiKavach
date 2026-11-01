"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { SidebarNav, type NavItem } from "@/components/navigation/sidebar-nav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  items: NavItem[];
  title: string;
  className?: string;
}

/** Hamburger that opens the navigation in a left drawer. Choosing an item closes the drawer. */
export function MobileNav({ items, title, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const closing = items.map((item) => ({
    ...item,
    onSelect: () => {
      item.onSelect?.();
      setOpen(false);
    },
  }));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex rounded-md p-1.5 text-soil-700 hover:bg-soil-100", className)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">Choose a workspace panel</SheetDescription>
          </SheetHeader>
          <SidebarNav items={closing} ariaLabel={title} className="px-2" />
        </SheetContent>
      </Sheet>
    </>
  );
}
