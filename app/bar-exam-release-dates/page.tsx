import type { Metadata } from "next";
import BarExamResultsTable from "@/components/bar-exam-results-table";
import { fetchBarExamResults } from "@/lib/supabase/server";
import { getDefaultCycle } from "@/types/bar-exam";

export const metadata: Metadata = {
  title: "Bar Exam Results Release Dates",
  description: "Public bar exam release dates and result links by state.",
};

/** Fetch on each request so Supabase env and RLS apply at runtime (no client-side initial load). */
export const dynamic = "force-dynamic";

function normalizeCycle(value: string | undefined): string {
  if (!value) return getDefaultCycle();
  const normalized = value.trim().toLowerCase();
  if (/^(feb|jul)-\d{4}$/.test(normalized)) return normalized;
  return getDefaultCycle();
}

function formatCycleLabel(cycle: string): string {
  const [month, year] = cycle.split("-");
  if (!month || !year) return cycle;
  const monthLabel = month === "feb" ? "February" : month === "jul" ? "July" : month;
  return `${monthLabel} ${year}`;
}

function getNextExamSittingLabel(cycle: string): string {
  const [month, yearText] = cycle.split("-");
  const year = Number(yearText);
  if (!month || Number.isNaN(year)) return cycle;
  if (month === "feb") return `July ${year}`;
  if (month === "jul") return `February ${year + 1}`;
  return cycle;
}

export default async function BarResultsPage({
  searchParams,
}: {
  searchParams?: Promise<{ cycle?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cycle = normalizeCycle(params.cycle);
  const nextExamSitting = getNextExamSittingLabel(cycle);
  const { rows, error } = await fetchBarExamResults(cycle);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>Preparing for the {nextExamSitting} bar exam?</p>
            <a
              href="https://www.makethisyourlasttime.com"
              className="inline-flex items-center gap-1 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-600 dark:decoration-zinc-500 dark:hover:decoration-zinc-300"
            >
              ← Back to Make This Your Last Time
            </a>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Bar Exam Results Release Dates: {formatCycleLabel(cycle)}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Release timelines and official results links. Data is shown for
            general information; confirm deadlines with your jurisdiction.
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            <p className="font-medium">Could not load results</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        ) : (
          <BarExamResultsTable rows={rows} cycle={cycle} />
        )}
      </main>
    </div>
  );
}
