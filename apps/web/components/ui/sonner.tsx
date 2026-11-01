"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** App-wide toast host. The theme is fixed to light: the app has no dark mode. */
export function Toaster(props: ToasterProps) {
  return <Sonner theme="light" richColors closeButton position="top-right" {...props} />;
}
