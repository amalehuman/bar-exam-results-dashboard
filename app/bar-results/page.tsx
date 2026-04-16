import type { Metadata } from "next";
import BarExamResultsTable from "@/components/bar-exam-results-table";
import { fetchBarExamResults } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bar Exam Results: February 2026",
  description: "Public bar exam release dates and result links by state.",
};

/** Fetch on each request so Supabase env and RLS apply at runtime (no client-side initial load). */
export const dynamic = "force-dynamic";

export default async function BarResultsPage() {
  const { rows, error } = await fetchBarExamResults();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Bar Exam Results: February 2026
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
          <BarExamResultsTable rows={rows} />
        )}
      </main>
    </div>
  );
}
