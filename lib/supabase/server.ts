import { createClient } from "@supabase/supabase-js";
import type { BarExamResultRow } from "@/types/bar-exam";

export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function fetchBarExamResults(): Promise<{
  rows: BarExamResultRow[];
  error: string | null;
}> {
  const env = getSupabaseEnv();
  if (!env) {
    return {
      rows: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const supabase = createClient(env.url, env.key);
  const { data, error } = await supabase
    .from("bar_exam_results")
    .select("*");

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data as BarExamResultRow[]) ?? [], error: null };
}
