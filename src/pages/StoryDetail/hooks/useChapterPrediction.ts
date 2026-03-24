import { differenceInDays } from "date-fns";
import { lsGet, lsSet } from "../utils/helpers";

type ChapterLog = { chapter: number; date: string };

export type Prediction = {
  avgDays: number | null;
  daysUntil: number | null;
  confidence: "high" | "medium" | "low" | "insufficient";
  message: string;
  progressPct: number;
};

export const getCHLog  = (sid: string): ChapterLog[] => lsGet<ChapterLog[]>(`ch_log_${sid}`, []);
export const pushCHLog = (sid: string, ch: number) => {
  const log = getCHLog(sid);
  if (log[0]?.chapter === ch) return;
  log.unshift({ chapter: ch, date: new Date().toISOString() });
  lsSet(`ch_log_${sid}`, log.slice(0, 40));
};

export function computePrediction(sid: string, lastUpdatedAt: string): Prediction {
  const log = getCHLog(sid);
  const daysSinceLast = differenceInDays(new Date(), new Date(lastUpdatedAt));

  if (log.length < 2) {
    return {
      avgDays: null, daysUntil: null, confidence: "insufficient",
      message: daysSinceLast === 0
        ? "Chapter updated today — check back soon!"
        : `Updated ${daysSinceLast}d ago · Need more data for prediction`,
      progressPct: 0,
    };
  }

  const intervals: number[] = [];
  for (let i = 0; i < log.length - 1; i++) {
    const diff = differenceInDays(new Date(log[i].date), new Date(log[i + 1].date));
    if (diff > 0) intervals.push(diff);
  }
  if (!intervals.length) return {
    avgDays: null, daysUntil: null, confidence: "insufficient",
    message: "Need more chapter update history", progressPct: 0,
  };

  const avg    = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const stdDev = Math.sqrt(intervals.reduce((a, v) => a + (v - avg) ** 2, 0) / intervals.length);
  const cv     = stdDev / avg;
  const confidence: Prediction["confidence"] =
    intervals.length >= 5 && cv < 0.25 ? "high"
    : intervals.length >= 3 && cv < 0.55 ? "medium"
    : "low";

  const daysUntil  = Math.round(avg) - daysSinceLast;
  const progressPct = Math.min(100, Math.round((daysSinceLast / avg) * 100));

  let message = "";
  if (daysUntil < -3)      message = `Overdue by ${Math.abs(daysUntil)}d (avg every ${Math.round(avg)}d)`;
  else if (daysUntil <= 0) message = `Chapter likely releasing soon! (avg every ${Math.round(avg)}d)`;
  else if (daysUntil === 1) message = `Chapter likely tomorrow! (avg every ${Math.round(avg)}d)`;
  else                      message = `Next chapter in ~${daysUntil}d (avg every ${Math.round(avg)}d)`;

  return { avgDays: avg, daysUntil, confidence, message, progressPct };
}