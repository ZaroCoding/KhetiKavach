"use client";

import { useSyncExternalStore } from "react";

import { isApiSlow, subscribeApiSlow } from "@/lib/api";

/** Says why the page is still waiting, so a server waking from sleep does not look broken. */
export default function SlowApiNotice() {
  const slow = useSyncExternalStore(subscribeApiSlow, isApiSlow, () => false);
  if (!slow) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[90vw] rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-soil-700 shadow-md"
    >
      Waking up the server. This can take up to a minute the first time.
    </div>
  );
}
