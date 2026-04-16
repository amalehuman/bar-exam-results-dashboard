/** Row shape for public `bar_exam_results` reads (adjust if your column names differ). */
export type BarExamResultRow = {
  id?: string;
  cycle: string;
  state: string;
  exam_type: string;
  results_release_date: string | null;
  results_release_estimate: string | null;
  results_confirmed: boolean;
  results_url: string | null;
};

/**
 * Returns the default exam cycle in Pacific time:
 * - Mar-Jul => feb-currentYear
 * - Aug-Dec => jul-currentYear
 * - Jan-Feb => jul-previousYear
 */
export function getDefaultCycle(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const month = Number(parts.find((p) => p.type === "month")?.value);
  const year = Number(parts.find((p) => p.type === "year")?.value);

  if (month >= 3 && month <= 7) return `feb-${year}`;
  if (month >= 8 && month <= 12) return `jul-${year}`;
  return `jul-${year - 1}`;
}
