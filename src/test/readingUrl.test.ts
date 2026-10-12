import { describe, expect, it } from "vitest";
import { getContinueReadingTarget } from "../lib/readingUrl";

describe("getContinueReadingTarget", () => {
  it("uses the story progress chapter instead of the source chapter", () => {
    const story = {
      currentChapter: 7,
      sources: [
        { id: "a", name: "Source A", url: "https://example.com/manga", currentChapter: 15 },
        { id: "b", name: "Source B", url: "https://example.com/other", currentChapter: 9 },
      ],
    };

    const result = getContinueReadingTarget(story as any);

    expect(result.chapter).toBe(7);
    expect(result.url).toBe("https://example.com/manga/chapter-7/");
    expect(result.source?.name).toBe("Source A");
  });
});
