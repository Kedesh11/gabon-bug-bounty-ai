// Derives a "recent activity" feed from real data already fetched by the dashboards
// (reports, programmes) instead of a fabricated feed. No new backend endpoint needed:
// GET /api/reports is already scoped server-side by role, so this naturally shows
// platform-wide activity to admin/triage/finance/support and a hacker's/entreprise's
// own activity to them — never data they shouldn't see.
import { Report, Programme, ProgrammeActivity } from "@/types/domain";

const MAX_ACTIVITIES = 8;

export function buildActivityFeed(reports: Report[], programmes: Programme[]): ProgrammeActivity[] {
  const submissions: ProgrammeActivity[] = reports.map((r) => ({
    id: `submission-${r.id}`,
    title: "Nouveau Rapport Soumis",
    subtitle: `${r.vulnerability} sur ${r.programmeName}`,
    type: "submission",
    createdAt: r.createdAt,
    hackerName: r.hackerName,
    programmeName: r.programmeName,
  }));

  const rewards: ProgrammeActivity[] = reports
    .filter((r) => r.reward > 0)
    .map((r) => ({
      id: `reward-${r.id}`,
      title: "Récompense Payée",
      subtitle: `${r.reward.toLocaleString()} XAF versés`,
      type: "reward",
      createdAt: r.updatedAt,
      amount: r.reward,
      hackerName: r.hackerName,
      programmeName: r.programmeName,
    }));

  const newProgrammes: ProgrammeActivity[] = programmes.map((p) => ({
    id: `programme-${p.id}`,
    title: "Nouveau Programme Lancé",
    subtitle: p.entrepriseName,
    type: "update",
    createdAt: p.createdAt,
    programmeName: p.name,
  }));

  return [...submissions, ...rewards, ...newProgrammes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ACTIVITIES);
}
