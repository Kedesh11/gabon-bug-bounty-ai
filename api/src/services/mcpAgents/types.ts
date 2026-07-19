import type { Severity } from "@prisma/client";

// Everything an agent is allowed to reason about — deliberately just the report's
// own submitted content (plus the platform's pre-existing exact-match duplicate
// check and the programme's reward tiers). No agent prompt should ever pull in
// data beyond what's captured here: this is what "ground strictly in the report"
// means in practice.
export interface ReportContext {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  vulnerabilityCategoryName: string | null;
  cweId: string | null;
  affectedAsset: string | null;
  stepsToReproduce: string | null;
  impact: string | null;
  remediation: string | null;
  proof: string;
  cvssVector: string | null;
  cvssScore: number | null;
  // From the existing synchronous exact-match check (duplicateDetection.ts) — given
  // to agents as a known fact, not something they need to re-derive.
  isDuplicateExactMatch: boolean;
  programmeName: string;
  rewardCurrency: string;
  rewardTiers: { severity: Severity; min: number; max: number; note: string | null }[];
}
