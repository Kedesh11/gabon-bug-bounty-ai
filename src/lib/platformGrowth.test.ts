import { describe, it, expect } from "vitest";
import { buildGrowthSeries } from "./platformGrowth";

describe("buildGrowthSeries", () => {
  it("returns 7 months ending at the most recent joinedAt in the data", () => {
    const series = buildGrowthSeries([{ joinedAt: "2024-07-15" }], []);
    expect(series).toHaveLength(7);
    expect(series[6].label.toLowerCase()).toContain("juil");
  });

  it("is cumulative: once someone has joined, they keep counting in every later month", () => {
    const series = buildGrowthSeries([{ joinedAt: "2024-02-01" }, { joinedAt: "2024-06-01" }], []);
    // reference month = Jun 2024 (latest joinedAt) → window is Dec 2023..Jun 2024:
    // Dec(0) Jan(1) Feb(2) Mar(3) Apr(4) May(5) Jun(6)
    expect(series[1].hackers).toBe(0); // Jan 2024: nobody has joined yet
    expect(series[2].hackers).toBe(1); // Feb 2024: first hacker joins
    expect(series[5].hackers).toBe(1); // May 2024: still just the first hacker
    expect(series[6].hackers).toBe(2); // Jun 2024: second hacker joins too
  });

  it("counts hackers and entreprises independently", () => {
    const series = buildGrowthSeries([{ joinedAt: "2024-07-01" }], [{ joinedAt: "2024-07-01" }, { joinedAt: "2024-06-01" }]);
    expect(series[6].hackers).toBe(1);
    expect(series[6].entreprises).toBe(2);
  });

  it("falls back to the current month when there is no data at all", () => {
    const series = buildGrowthSeries([], []);
    expect(series).toHaveLength(7);
    expect(series.every((p) => p.hackers === 0 && p.entreprises === 0)).toBe(true);
  });
});
