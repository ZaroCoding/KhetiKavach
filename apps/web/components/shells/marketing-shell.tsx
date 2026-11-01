import { Children, isValidElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SlotProps {
  children: ReactNode;
}

function Nav({ children }: SlotProps) {
  return <>{children}</>;
}
function Hero({ children }: SlotProps) {
  return <>{children}</>;
}
function Main({ children }: SlotProps) {
  return <>{children}</>;
}
function Footer({ children }: SlotProps) {
  return <>{children}</>;
}

function slot(children: ReactNode, marker: (props: SlotProps) => ReactNode): ReactNode {
  const match = Children.toArray(children).find((child) => isValidElement(child) && child.type === marker);
  return isValidElement<SlotProps>(match) ? match.props.children : null;
}

interface MarketingShellProps {
  children: ReactNode;
  className?: string;
}

/** Landing-page frame: sticky blurred nav, hero, content sections and a footer. */
function MarketingShellRoot({ children, className }: MarketingShellProps) {
  const nav = slot(children, Nav);
  const hero = slot(children, Hero);
  const main = slot(children, Main);
  const footer = slot(children, Footer);

  return (
    <div className={cn("flex min-h-dvh w-full flex-col bg-background", className)}>
      {nav && (
        <header className="sticky top-0 z-40 h-14 shrink-0 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl items-center gap-4 px-4">{nav}</div>
        </header>
      )}
      {hero && <section className="shrink-0">{hero}</section>}
      {main && <main className="flex-1">{main}</main>}
      {footer && (
        <footer className="shrink-0 border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-8">{footer}</div>
        </footer>
      )}
    </div>
  );
}

export const MarketingShell = Object.assign(MarketingShellRoot, { Nav, Hero, Main, Footer });
