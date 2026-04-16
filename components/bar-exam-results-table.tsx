"use client";

import { useMemo, useState } from "react";
import type { BarExamResultRow } from "@/types/bar-exam";

type ExamFilter = "all" | "ube" | "non-ube";
type StatusFilter = "all" | "released" | "confirmed" | "not-released";

type SortKey =
  | "state"
  | "exam_type"
  | "results_release_date"
  | "results_release_estimate"
  | "results_confirmed"
  | "results_url";

type SortDir = "asc" | "desc";

function isUbeExam(examType: string): boolean {
  const t = examType.toLowerCase();
  if (t.includes("non-ube") || t.includes("non ube")) return false;
  return t.includes("ube");
}

/**
 * Interprets a YYYY-MM-DD prefix (optional trailing time/TZ) as a calendar date in the
 * local timezone, avoiding the UTC midnight shift from `new Date("YYYY-MM-DD")`.
 */
function parseLocalCalendarDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, month - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

function formatCalendarDate(value: string | null): string {
  if (!value) return "—";
  const d = parseLocalCalendarDate(value);
  if (!d) return value.trim();
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function calendarDateSortKey(value: string | null): number | null {
  if (!value) return null;
  const d = parseLocalCalendarDate(value);
  if (!d) return null;
  return d.getTime();
}

/** Today's calendar date in Pacific time as YYYY-MM-DD (for comparisons with DB date strings). */
function getPacificTodayYmd(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
}

function extractYmdPrefix(value: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return m ? m[1] : null;
}

type RowStatus = "released" | "confirmed" | "estimated";

function getRowStatus(row: BarExamResultRow, todayYmd: string): RowStatus {
  const releaseYmd = extractYmdPrefix(row.results_release_date);
  if (releaseYmd) {
    if (releaseYmd < todayYmd) return "released";
    return "confirmed";
  }
  if (!row.results_confirmed) return "estimated";
  return "confirmed";
}

/** Sort order: estimated < confirmed < released */
function statusSortRank(status: RowStatus): number {
  switch (status) {
    case "estimated":
      return 0;
    case "confirmed":
      return 1;
    case "released":
      return 2;
    default:
      return 0;
  }
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareNullableString(a: string | null, b: string | null): number {
  return compareStrings(a ?? "", b ?? "");
}

export default function BarExamResultsTable({
  rows,
}: {
  rows: BarExamResultRow[];
}) {
  const [examFilter, setExamFilter] = useState<ExamFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("state");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const todayPacificYmd = getPacificTodayYmd();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (examFilter === "ube" && !isUbeExam(row.exam_type)) return false;
      if (examFilter === "non-ube" && isUbeExam(row.exam_type)) return false;
      const status = getRowStatus(row, todayPacificYmd);
      if (statusFilter === "released" && status !== "released") return false;
      if (statusFilter === "confirmed" && status !== "confirmed") return false;
      if (statusFilter === "not-released" && status !== "estimated") return false;
      if (q && !row.state.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, examFilter, statusFilter, query, todayPacificYmd]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "state":
          cmp = compareStrings(a.state, b.state);
          break;
        case "exam_type":
          cmp = compareStrings(a.exam_type, b.exam_type);
          break;
        case "results_release_date": {
          const va = calendarDateSortKey(a.results_release_date);
          const vb = calendarDateSortKey(b.results_release_date);
          if (va === null && vb === null) cmp = 0;
          else if (va === null) cmp = 1;
          else if (vb === null) cmp = -1;
          else cmp = va - vb;
          break;
        }
        case "results_release_estimate":
          cmp = compareNullableString(
            a.results_release_estimate,
            b.results_release_estimate,
          );
          break;
        case "results_confirmed":
          cmp =
            statusSortRank(getRowStatus(a, todayPacificYmd)) -
            statusSortRank(getRowStatus(b, todayPacificYmd));
          break;
        case "results_url":
          cmp = compareNullableString(a.results_url, b.results_url);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return copy;
  }, [filtered, sortKey, sortDir, todayPacificYmd]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <label className="flex min-w-[200px] flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Search by state
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none ring-zinc-400/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-500/40"
            autoComplete="off"
          />
        </label>
        <label className="flex min-w-[200px] flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Exam type
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value as ExamFilter)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none ring-zinc-400/40 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-500/40"
          >
            <option value="all">All</option>
            <option value="ube">UBE</option>
            <option value="non-ube">Non-UBE</option>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none ring-zinc-400/40 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-500/40"
          >
            <option value="all">All</option>
            <option value="released">Released</option>
            <option value="confirmed">Confirmed</option>
            <option value="not-released">Not Released</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[11%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
              <SortableTh
                label="State"
                sortKey="state"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label="Exam Type"
                sortKey="exam_type"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label="Release Date"
                sortKey="results_release_date"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label="Estimated Timeline"
                sortKey="results_release_estimate"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label="Status"
                sortKey="results_confirmed"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <SortableTh
                label="Results URL"
                sortKey="results_url"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={row.id ?? `${row.state}-${row.exam_type}-${i}`}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    {row.state}
                  </td>
                  <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                    {row.exam_type}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800 dark:text-zinc-200">
                    {formatCalendarDate(row.results_release_date)}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-zinc-800 dark:text-zinc-200">
                    {row.results_release_estimate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge row={row} todayPacificYmd={todayPacificYmd} />
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3">
                    {row.results_url ? (
                      <a
                        href={row.results_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-950 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-600 dark:text-zinc-100 dark:decoration-zinc-500 dark:hover:decoration-zinc-300"
                      >
                        {row.results_url}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Showing {sorted.length} of {rows.length} jurisdictions.
      </p>
    </div>
  );
}

function StatusBadge({
  row,
  todayPacificYmd,
}: {
  row: BarExamResultRow;
  todayPacificYmd: string;
}) {
  const status = getRowStatus(row, todayPacificYmd);
  if (status === "released") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-400">
        Released
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-400">
        Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
      Estimated
    </span>
  );
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th scope="col" className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-zinc-200/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:hover:bg-zinc-800/80 dark:focus-visible:outline-zinc-500"
        aria-sort={
          active ? (dir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        <span className="text-[10px] font-normal text-zinc-500" aria-hidden>
          {active ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}
