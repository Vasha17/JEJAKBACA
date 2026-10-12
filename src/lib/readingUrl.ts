export type ContinueReadingTarget = {
  chapter: number;
  source: {
    id?: string;
    name?: string;
    url?: string;
    currentChapter?: number;
  } | null;
  url: string | null;
};

function normalizeChapter(value: number | string | undefined | null): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildReadingUrl(url: string, chapter: number) {
  const rawUrl = String(url ?? "").trim();
  if (!rawUrl) return null;

  const base = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const cleanBase = base.replace(/\/+$/, "");
  const isInfoSite = /myanimelist\.net|anilist\.co|mangaupdates\.com|kitsu\.io/.test(base);
  const isSpecialSource = /atsu\.moe|mangadot\.net/i.test(cleanBase);

  if (isInfoSite || isSpecialSource || cleanBase.includes("?")) return cleanBase;
  return `${cleanBase}/chapter-${chapter}/`;
}

export function getContinueReadingTarget(story: any): ContinueReadingTarget | null {
  if (!story?.sources?.length) return null;

  const currentChapter = normalizeChapter(story.currentChapter);
  const preferredSource = [...story.sources].sort((a: any, b: any) => {
    return normalizeChapter(b.currentChapter) - normalizeChapter(a.currentChapter);
  })[0];

  if (!preferredSource?.url) return null;

  const targetChapter = currentChapter > 0
    ? currentChapter
    : Math.max(normalizeChapter(preferredSource.currentChapter), 1);

  return {
    chapter: targetChapter,
    source: preferredSource,
    url: buildReadingUrl(preferredSource.url, targetChapter),
  };
}
