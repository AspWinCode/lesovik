import { useSearchParams } from "react-router-dom";
import type { App } from "../api/apps";

/**
 * Resolve the "currently edited" app from a list, honouring the `?app=<id>`
 * query parameter so navigation from the main page opens the chosen app.
 * Falls back to the first app when the param is missing or unknown.
 *
 * Pure resolver split out for unit testing.
 */
export function resolveActiveApp(apps: App[], appIdParam: string | null): App | undefined {
  if (appIdParam) {
    const match = apps.find((a) => a.id === appIdParam);
    if (match) return match;
  }
  return apps[0];
}

/** Hook wrapper around {@link resolveActiveApp} that reads the URL param. */
export function useActiveApp(apps: App[]): App | undefined {
  const [params] = useSearchParams();
  return resolveActiveApp(apps, params.get("app"));
}
