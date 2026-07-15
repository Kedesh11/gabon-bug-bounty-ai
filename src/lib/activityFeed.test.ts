import { describe, it, expect } from "vitest";
import { buildActivityFeed } from "./activityFeed";
import { Report, Programme } from "@/types/domain";

const baseReport: Report = {
  id: "r1",
  title: "XSS",
  description: "desc",
  severity: "haute",
  status: "accepté",
  hackerId: "h1",
  hackerName: "CyberPanther",
  programmeId: "p1",
  programmeName: "API Gouv",
  entrepriseId: "e1",
  reward: 0,
  createdAt: "2024-07-10T00:00:00.000Z",
  updatedAt: "2024-07-10T00:00:00.000Z",
  vulnerability: "XSS",
  proof: "poc",
};

const baseProgramme: Programme = {
  id: "p1",
  name: "API Gouv",
  entrepriseId: "e1",
  entrepriseName: "Ministère",
  description: "desc",
  scope: [],
  minReward: 1000,
  maxReward: 5000,
  status: "actif",
  createdAt: "2024-07-01T00:00:00.000Z",
  reportsCount: 1,
};

describe("buildActivityFeed", () => {
  it("emits a submission activity for every report", () => {
    const activities = buildActivityFeed([baseReport], []);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ type: "submission", hackerName: "CyberPanther" });
  });

  it("also emits a reward activity when a report has a reward", () => {
    const paid: Report = { ...baseReport, reward: 500000, updatedAt: "2024-07-12T00:00:00.000Z" };
    const activities = buildActivityFeed([paid], []);
    expect(activities.map((a) => a.type)).toEqual(expect.arrayContaining(["submission", "reward"]));
  });

  it("emits an update activity for every programme", () => {
    const activities = buildActivityFeed([], [baseProgramme]);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ type: "update", programmeName: "API Gouv" });
  });

  it("sorts everything by recency, most recent first", () => {
    const older: Report = { ...baseReport, id: "r-old", createdAt: "2024-01-01T00:00:00.000Z" };
    const newer: Report = { ...baseReport, id: "r-new", createdAt: "2024-12-01T00:00:00.000Z" };
    const activities = buildActivityFeed([older, newer], []);
    expect(activities[0].id).toBe("submission-r-new");
    expect(activities[1].id).toBe("submission-r-old");
  });

  it("caps the feed at 8 entries", () => {
    const many: Report[] = Array.from({ length: 20 }, (_, i) => ({
      ...baseReport,
      id: `r${i}`,
      createdAt: new Date(2024, 0, i + 1).toISOString(),
    }));
    expect(buildActivityFeed(many, [])).toHaveLength(8);
  });
});
