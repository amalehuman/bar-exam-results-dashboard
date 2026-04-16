/** Row shape for public `bar_exam_results` reads (adjust if your column names differ). */
export type BarExamResultRow = {
  id?: string;
  state: string;
  exam_type: string;
  results_release_date: string | null;
  results_release_estimate: string | null;
  results_confirmed: boolean;
  results_url: string | null;
};
