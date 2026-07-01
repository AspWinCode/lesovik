import { describe, expect, it } from "vitest";
import { resolveActiveApp } from "./useActiveApp";
import type { App } from "../api/apps";

function app(id: string, name: string): App {
  return {
    id,
    slug: name.toLowerCase(),
    name,
    description: null,
    icon: null,
    color: null,
    category: null,
    owner_id: "u1",
    is_published: false,
    is_archived: false,
    settings: {},
    version: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("resolveActiveApp", () => {
  const apps = [app("a1", "First"), app("a2", "Second"), app("a3", "Third")];

  it("returns the app matching the ?app= param", () => {
    expect(resolveActiveApp(apps, "a2")?.id).toBe("a2");
  });

  it("falls back to the first app when the param is missing", () => {
    expect(resolveActiveApp(apps, null)?.id).toBe("a1");
  });

  it("falls back to the first app when the param is unknown", () => {
    expect(resolveActiveApp(apps, "nope")?.id).toBe("a1");
  });

  it("returns undefined for an empty list", () => {
    expect(resolveActiveApp([], "a2")).toBeUndefined();
  });
});
