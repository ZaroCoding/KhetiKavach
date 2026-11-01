import type { VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonLinkProps extends VariantProps<typeof buttonVariants> {
  href: string;
  children: ReactNode;
  className?: string;
  /** Opens in a new tab with rel=noreferrer (use for links that leave the app). */
  external?: boolean;
}

/** A link that looks like a Button. Our Button wraps base-ui, which has no `asChild`. */
export function ButtonLink({ href, children, className, external = false, variant, size }: ButtonLinkProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
