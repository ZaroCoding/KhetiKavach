"use client";

import { useEffect, useState } from "react";

import { fetchHealth, type Health } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ok"; health: Health }
  | { kind: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    fetchHealth()
      .then((health) => setState({ kind: "ok", health }))
      .catch((error: unknown) =>
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      );
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">KhetKavach</h1>
      <p className="text-sm text-muted-foreground">API health</p>
      {state.kind === "loading" && <p>Checking API…</p>}
      {state.kind === "error" && (
        <pre className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {state.message}
        </pre>
      )}
      {state.kind === "ok" && (
        <pre data-testid="health-json" className="rounded border bg-muted p-4 text-sm">
          {JSON.stringify(state.health, null, 2)}
        </pre>
      )}
    </main>
  );
}
