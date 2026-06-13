import { describe, expect, it } from "vitest";
import { appsToDbRows } from "./AdminPage";

describe("appsToDbRows", () => {
  it("derives a *_db name and status from each app", () => {
    const rows = appsToDbRows([
      { slug: "fitness", name: "Fitness App", is_published: true, is_archived: false, version: 3 },
      { slug: "draft", name: "Draft App", is_published: false, is_archived: false, version: 1 },
      { slug: "old", name: "Old App", is_published: true, is_archived: true, version: 9 },
    ]);
    expect(rows[0]).toMatchObject({ name: "fitness_db", app: "Fitness App", status: "Активна", version: "v3" });
    expect(rows[1].status).toBe("В разработке");
    expect(rows[2].status).toBe("В архиве");
  });

  it("returns an empty array for no apps", () => {
    expect(appsToDbRows([])).toEqual([]);
  });
});
