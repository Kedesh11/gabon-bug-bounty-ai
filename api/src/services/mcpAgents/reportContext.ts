import type { Severity } from "@prisma/client";
import type { ReportContext } from "./types.js";

interface ReportForContext {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  affectedAsset: string | null;
  stepsToReproduce: string | null;
  impact: string | null;
  remediation: string | null;
  proof: string;
  cvssVector: string | null;
  cvssScore: number | null;
  vulnerabilityCategory: { name: string; cweId: string | null } | null;
  aiAnalysis: { isDuplicate: boolean } | null;
  programme: {
    name: string;
    rewardCurrency: string;
    rewardTiers: { severity: Severity; min: number; max: number; note: string | null }[];
  };
}

export function buildReportContext(report: ReportForContext): ReportContext {
  return {
    id: report.id,
    title: report.title,
    description: report.description,
    severity: report.severity,
    vulnerabilityCategoryName: report.vulnerabilityCategory?.name ?? null,
    cweId: report.vulnerabilityCategory?.cweId ?? null,
    affectedAsset: report.affectedAsset,
    stepsToReproduce: report.stepsToReproduce,
    impact: report.impact,
    remediation: report.remediation,
    proof: report.proof,
    cvssVector: report.cvssVector,
    cvssScore: report.cvssScore,
    isDuplicateExactMatch: report.aiAnalysis?.isDuplicate ?? false,
    programmeName: report.programme.name,
    rewardCurrency: report.programme.rewardCurrency,
    rewardTiers: report.programme.rewardTiers,
  };
}

function line(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return `${label} : (non renseigné)`;
  return `${label} : ${value}`;
}

// The one and only place report content is turned into prompt text — every agent
// uses this exact block, so "grounded in the report" means the same thing everywhere.
export function formatReportContextForPrompt(context: ReportContext): string {
  return [
    "=== RAPPORT SOUMIS PAR LE HACKER ===",
    line("Titre", context.title),
    line("Sévérité choisie par le hacker", context.severity),
    line("Catégorie de vulnérabilité", context.vulnerabilityCategoryName),
    line("CWE", context.cweId),
    line("Actif touché", context.affectedAsset),
    "",
    "Description :",
    context.description,
    "",
    "Étapes de reproduction :",
    context.stepsToReproduce ?? "(non renseigné)",
    "",
    "Impact décrit par le hacker :",
    context.impact ?? "(non renseigné)",
    "",
    "Remédiation déjà proposée par le hacker :",
    context.remediation ?? "(non renseigné)",
    "",
    "Preuve / preuve de concept :",
    context.proof,
    "",
    line("CVSS déjà renseigné par le hacker (vecteur)", context.cvssVector),
    line("CVSS déjà renseigné par le hacker (score)", context.cvssScore),
    line("Doublon exact déjà détecté par le système (même programme+catégorie+actif)", context.isDuplicateExactMatch ? "oui" : "non"),
    line("Programme", context.programmeName),
    "=== FIN DU RAPPORT ===",
  ].join("\n");
}
