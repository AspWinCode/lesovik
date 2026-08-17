import { describe, expect, it } from "vitest";
import { normalizeChoices } from "./choices";

describe("normalizeChoices", () => {
  it("wraps bare strings into {value, label} pairs", () => {
    expect(normalizeChoices(["кг", "г", "шт"])).toEqual([
      { value: "кг", label: "кг" },
      { value: "г", label: "г" },
      { value: "шт", label: "шт" },
    ]);
  });

  it("passes {value, label} objects through unchanged", () => {
    const objects = [{ value: "draft", label: "Draft" }, { value: "paid", label: "Paid" }];
    expect(normalizeChoices(objects)).toEqual(objects);
  });

  it("handles a mixed list of strings and objects", () => {
    expect(normalizeChoices(["кг", { value: "г", label: "Грамм" }])).toEqual([
      { value: "кг", label: "кг" },
      { value: "г", label: "Грамм" },
    ]);
  });

  it("returns an empty array for non-array or missing input", () => {
    expect(normalizeChoices(undefined)).toEqual([]);
    expect(normalizeChoices(null)).toEqual([]);
    expect(normalizeChoices("not an array")).toEqual([]);
    expect(normalizeChoices({})).toEqual([]);
  });
});
