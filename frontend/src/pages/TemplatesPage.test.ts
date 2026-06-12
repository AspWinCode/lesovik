import { describe, expect, it } from "vitest";
import { filterTemplates } from "./TemplatesPage";

// Minimal template shapes matching the filter's expectations.
const list = [
  { id: "a", name: "Инвентаризация", desc: "склад", color: "", emoji: "", category: "Инвентаризация", functions: ["Управление"], features: ["Офлайн"], complexity: "Средний" },
  { id: "b", name: "Опрос",          desc: "формы", color: "", emoji: "", category: "Бизнес",         functions: ["Отслеживание"], features: ["Веб"],    complexity: "Простой" },
  { id: "c", name: "Кадровый учёт",  desc: "сотрудники", color: "", emoji: "", category: "Кадры",     functions: ["Управление"], features: ["Веб"],    complexity: "Сложный" },
];

const ALL = { search: "", category: "Все", func: "Все", feature: "Все", complexity: "Все" };

describe("filterTemplates", () => {
  it("returns everything with no filters", () => {
    expect(filterTemplates(list, ALL)).toHaveLength(3);
  });

  it("filters by category", () => {
    const r = filterTemplates(list, { ...ALL, category: "Кадры" });
    expect(r.map((t) => t.id)).toEqual(["c"]);
  });

  it("filters by function tag", () => {
    const r = filterTemplates(list, { ...ALL, func: "Управление" });
    expect(r.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("filters by feature and complexity together", () => {
    const r = filterTemplates(list, { ...ALL, feature: "Веб", complexity: "Простой" });
    expect(r.map((t) => t.id)).toEqual(["b"]);
  });

  it("filters by search across name and description", () => {
    expect(filterTemplates(list, { ...ALL, search: "склад" }).map((t) => t.id)).toEqual(["a"]);
    expect(filterTemplates(list, { ...ALL, search: "опрос" }).map((t) => t.id)).toEqual(["b"]);
  });

  it("combines search with dropdown filters", () => {
    expect(filterTemplates(list, { ...ALL, search: "учёт", category: "Бизнес" })).toHaveLength(0);
  });
});
