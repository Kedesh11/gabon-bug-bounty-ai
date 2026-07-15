// Cumulative hacker/entreprise growth per month, derived from real joinedAt dates —
// replaces a hardcoded [20, 35, 25, 45, 60, 85, 100] bar chart in AdminDashboard.
import { HackerProfile, EntrepriseProfile } from "@/types/domain";

export interface GrowthPoint {
  label: string;
  hackers: number;
  entreprises: number;
}

const MONTHS_WINDOW = 7;

// All-UTC month arithmetic throughout: date-only strings like "2024-02-01" parse as UTC
// midnight, so mixing them with local getFullYear()/getMonth() can shift the bucket by a
// month depending on the machine's timezone. Using the UTC variants everywhere sidesteps that.
function utcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// Anchored on the most recent joinedAt in the data (not "today") so the chart stays
// meaningful even when seed/demo data is dated well in the past.
export function buildGrowthSeries(
  hackers: Pick<HackerProfile, "joinedAt">[],
  entreprises: Pick<EntrepriseProfile, "joinedAt">[],
): GrowthPoint[] {
  const joinDates = [...hackers.map((h) => new Date(h.joinedAt)), ...entreprises.map((e) => new Date(e.joinedAt))];
  const referenceMonth = joinDates.length
    ? utcMonthStart(new Date(Math.max(...joinDates.map((d) => d.getTime()))))
    : utcMonthStart(new Date());

  const months = Array.from(
    { length: MONTHS_WINDOW },
    (_, i) => new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth() - (MONTHS_WINDOW - 1 - i), 1)),
  );

  return months.map((monthStart) => {
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
    return {
      label: monthStart.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }),
      hackers: hackers.filter((h) => new Date(h.joinedAt) < monthEnd).length,
      entreprises: entreprises.filter((e) => new Date(e.joinedAt) < monthEnd).length,
    };
  });
}
