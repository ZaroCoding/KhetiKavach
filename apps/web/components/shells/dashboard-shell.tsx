"use client";

import { PanelLeft } from "lucide-react";
import { Children, isValidElement, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SlotProps {
  children: ReactNode;
}

// Slots are marker components: the shell finds them by type and places their children.
function Header({ children }: SlotProps) {
  return <>{children}</>;
}
function Sidebar({ children }: SlotProps) {
  return <>{children}</>;
}
function Main({ children }: SlotProps) {
  return <>{children}</>;
}

function slot(children: ReactNode, marker: (props: SlotProps) => ReactNode): ReactNode {
  const match = Children.toArray(children).find((child) => isValidElement(child) && child.type === marker);
  return isValidElement<SlotProps>(match) ? match.props.children : null;
}

interface DashboardShellProps {
  children: ReactNode;
  sidebarWidth?: number;
  headerHeight?: number;
  className?: string;
}

/**
 * Full-height app frame: top bar, a sidebar that shows from `lg` up (and can be collapsed), and a
 * main area that fills the rest. Below `lg` the page supplies its own mobile navigation.
 */
function DashboardShellRoot({ children, sidebarWidth = 208, headerHeight = 52, className }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const header = slot(children, Header);
  const sidebar = slot(children, Sidebar);
  const main = slot(children, Main);

  return (
    <div className={cn("flex h-dvh w-full flex-col overflow-hidden bg-background", className)}>
      <header className="shrink-0 border-b bg-card" style={{ height: headerHeight }}>
        <div className="flex h-full items-center gap-2 px-3">
          {sidebar && (
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden rounded-md p-1.5 text-soil-700 hover:bg-soil-100 lg:inline-flex"
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              aria-expanded={sidebarOpen}
            >
              <PanelLeft className="size-5" />
            </button>
          )}
          {header}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {sidebar && sidebarOpen && (
          <aside className="hidden shrink-0 overflow-y-auto border-r bg-card lg:block" style={{ width: sidebarWidth }} aria-label="Workspace navigation">
            {sidebar}
          </aside>
        )}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{main}</main>
      </div>
    </div>
  );
}

export const DashboardShell = Object.assign(DashboardShellRoot, { Header, Sidebar, Main });
