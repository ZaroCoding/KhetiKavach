import type { components } from "./api-types";

export type Health = components["schemas"]["HealthOut"];

export class ApiError extends Error {}

export function apiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not set");
  }
  return url.replace(/\/$/, "");
}

export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<Health> {
  const response = await fetchImpl(`${apiBaseUrl()}/health`, { cache: "no-store" });
  if (!response.ok) {
    throw new ApiError(`API /health returned HTTP ${response.status}`);
  }
  return (await response.json()) as Health;
}
