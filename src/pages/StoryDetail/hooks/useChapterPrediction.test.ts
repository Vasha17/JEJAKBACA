import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computePrediction, getCHLog, pushCHLog } from "./useChapterPrediction";

describe("chapter prediction", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses chapter history timestamps to recover past prediction intervals", () => {
    localStorage.setItem("story_history_story-1", JSON.stringify([
      { type: "chapter", newValue: "12", createdAt: "2026-10-20T12:00:00.000Z" },
      { type: "chapter", newValue: "11", createdAt: "2026-10-10T12:00:00.000Z" },
      { type: "chapter", newValue: "10", createdAt: "2026-10-01T12:00:00.000Z" },
    ]));

    const prediction = computePrediction("story-1", "2026-10-01T12:00:00.000Z", "reading");

    expect(prediction.avgDays).toBeCloseTo(9.67, 1);
    expect(prediction.daysUntil).toBe(9);
    expect(prediction.message).toContain("Next chapter in ~9d");
  });

  it("records new chapter log entries using the current timestamp by default", () => {
    pushCHLog("story-1", 4);

    expect(getCHLog("story-1")[0]).toEqual({
      chapter: 4,
      date: "2026-10-21T12:00:00.000Z",
    });
  });
});