import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches. Returns null until the browser has answered, so
 * server-rendered markup never guesses a layout.
 */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
