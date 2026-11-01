/** Remote-data state used by AsyncContainer: every view shows loading, error or data, never a guess. */
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export const loading = { status: "loading" } as const;

export function failure(error: unknown): { status: "error"; message: string } {
  return { status: "error", message: error instanceof Error ? error.message : String(error) };
}
