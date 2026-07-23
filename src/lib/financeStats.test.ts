import { describe, it, expect } from "vitest";
import { buildTransactionFeed, topProgrammesByCost, pendingPayoutReports } from "./financeStats";
import { Payment, Payout } from "@/hooks/api/payments";
import { Report } from "@/types/domain";

const basePayment: Payment = {
  id: "pay1",
  programmeId: "p1",
  programme: { id: "p1", name: "API Gouv" },
  entrepriseId: "e1",
  entreprise: { profile: { name: "Ministère" } },
  provider: "stripe",
  status: "succeeded",
  amount: 500000,
  currency: "XAF",
  providerRef: "cs_1",
  createdAt: "2024-07-10T00:00:00.000Z",
  updatedAt: "2024-07-10T00:00:00.000Z",
};

const basePayout: Payout = {
  id: "po1",
  reportId: "r1",
  report: { id: "r1", title: "XSS stocké", programmeId: "p1", programme: { id: "p1", name: "API Gouv" } },
  hackerId: "h1",
  hacker: { profile: { name: "CyberPanther" } },
  provider: "cinetpay",
  status: "succeeded",
  amount: 150000,
  currency: "XAF",
  providerRef: "tr_1",
  createdAt: "2024-07-12T00:00:00.000Z",
  updatedAt: "2024-07-12T00:00:00.000Z",
};

const baseReport: Report = {
  id: "r2",
  title: "IDOR",
  description: "desc",
  severity: "haute",
  status: "accepté",
  hackerId: "h2",
  hackerName: "Gh0stNet",
  programmeId: "p1",
  programmeName: "API Gouv",
  entrepriseId: "e1",
  reward: 200000,
  createdAt: "2024-07-13T00:00:00.000Z",
  updatedAt: "2024-07-13T00:00:00.000Z",
  vulnerability: "IDOR",
  proof: "poc",
};

describe("buildTransactionFeed", () => {
  it("merges payments and payouts, sorted most recent first", () => {
    const feed = buildTransactionFeed([basePayment], [basePayout]);
    expect(feed).toHaveLength(2);
    expect(feed[0].kind).toBe("payout");
    expect(feed[1].kind).toBe("payment");
  });

  it("caps the feed at 8 entries", () => {
    const many: Payment[] = Array.from({ length: 20 }, (_, i) => ({
      ...basePayment,
      id: `pay${i}`,
      createdAt: new Date(2024, 0, i + 1).toISOString(),
    }));
    expect(buildTransactionFeed(many, [])).toHaveLength(8);
  });
});

describe("topProgrammesByCost", () => {
  it("sums succeeded payouts per programme", () => {
    const second: Payout = { ...basePayout, id: "po2", amount: 100000 };
    const result = topProgrammesByCost([basePayout, second]);
    expect(result).toEqual([{ programmeId: "p1", programmeName: "API Gouv", total: 250000 }]);
  });

  it("excludes non-succeeded payouts", () => {
    const failed: Payout = { ...basePayout, id: "po3", status: "failed" };
    expect(topProgrammesByCost([failed])).toEqual([]);
  });

  it("sorts by total descending and caps at 5", () => {
    const payouts: Payout[] = Array.from({ length: 7 }, (_, i) => ({
      ...basePayout,
      id: `po${i}`,
      report: { ...basePayout.report, programmeId: `p${i}`, programme: { id: `p${i}`, name: `Prog ${i}` } },
      amount: (i + 1) * 1000,
    }));
    const result = topProgrammesByCost(payouts);
    expect(result).toHaveLength(5);
    expect(result[0].total).toBe(7000);
  });
});

describe("pendingPayoutReports", () => {
  it("includes an accepted, rewarded report with no payout yet", () => {
    expect(pendingPayoutReports([baseReport], [])).toEqual([baseReport]);
  });

  it("excludes a report that already has a payout, even a failed one", () => {
    const payout: Payout = { ...basePayout, reportId: baseReport.id, status: "failed" };
    expect(pendingPayoutReports([baseReport], [payout])).toEqual([]);
  });

  it("excludes reports with no reward or not yet accepted", () => {
    const unrewarded: Report = { ...baseReport, id: "r3", reward: 0 };
    const notAccepted: Report = { ...baseReport, id: "r4", status: "soumis" };
    expect(pendingPayoutReports([unrewarded, notAccepted], [])).toEqual([]);
  });
});
