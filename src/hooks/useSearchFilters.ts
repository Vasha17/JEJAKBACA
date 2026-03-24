import { useState, useCallback } from "react";

export type ChipState = "none" | "include" | "exclude";

export interface FilterChip {
  label: string;
  state: ChipState;
}

const GENRES: string[] = [
  "Action", "Adventure", "AI", "Comedy", "Drama", "Ecchi", "Fantasy",
  "Gender Bender", "Gore", "Hentai", "Historical", "Horror", "Isekai",
  "LGBTQIA+", "Magical Girls", "Medical", "Mystery", "Philosophical",
  "Psychological", "Romance", "Sci-Fi", "Shoujo Ai", "Shounen Ai",
  "Slice of Life", "Sports", "Thriller", "Tragedy", "Wuxia", "Yaoi", "Yuri",
];

const THEMES: string[] = [
  "Coming of Age", "Cooking", "Crime", "Demons", "Harem", "Magic",
  "Martial Arts", "Mecha", "Military", "Monsters", "Music",
  "Office Workers", "Omegaverse", "Police", "Post-Apocalyptic",
  "Reincarnation", "Reverse Harem", "School Life", "Smut", "Supernatural",
  "Survival", "Time Travel", "Vampires", "Video Games", "Villainess",
];

const FORMATS: string[] = ["Manga", "Manhwa", "Manhua", "One Shot", "Doujinshi"];

const SOURCES: string[] = ["Original", "Light Novel", "Web Novel", "Visual Novel", "Game", "Other"];

const CONTENT_RATINGS: string[] = ["Safe", "Suggestive", "Erotica", "Pornographic"];

function initChips(labels: string[]): FilterChip[] {
  return labels.map((label) => ({ label, state: "none" }));
}

export function useSearchFilters() {
  const [genres, setGenres] = useState<FilterChip[]>(() => initChips(GENRES));
  const [themes, setThemes] = useState<FilterChip[]>(() => initChips(THEMES));
  const [formats, setFormats] = useState<FilterChip[]>(() => initChips(FORMATS));
  const [sources, setSources] = useState<FilterChip[]>(() => initChips(SOURCES));
  const [contentRatings, setContentRatings] = useState<FilterChip[]>(() => initChips(CONTENT_RATINGS));
  const [matchAll, setMatchAll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const cycleChip = useCallback(
    (setter: React.Dispatch<React.SetStateAction<FilterChip[]>>, index: number) => {
      setter((prev) =>
        prev.map((chip, i) => {
          if (i !== index) return chip;
          const next: ChipState =
            chip.state === "none" ? "include" : chip.state === "include" ? "exclude" : "none";
          return { ...chip, state: next };
        })
      );
    },
    []
  );

  const selectedCount = useCallback(
    () =>
      [...genres, ...themes, ...formats, ...sources, ...contentRatings].filter(
        (c) => c.state !== "none"
      ).length,
    [genres, themes, formats, sources, contentRatings]
  );

  const genreCount = genres.filter((c) => c.state !== "none").length;
  const formatCount = formats.filter((c) => c.state !== "none").length;
  const sourceCount = sources.filter((c) => c.state !== "none").length;
  const contentRatingCount = contentRatings.filter((c) => c.state !== "none").length;

  const resetAll = useCallback(() => {
    setGenres(initChips(GENRES));
    setThemes(initChips(THEMES));
    setFormats(initChips(FORMATS));
    setSources(initChips(SOURCES));
    setContentRatings(initChips(CONTENT_RATINGS));
    setMatchAll(true);
  }, []);

  const activeFilters = [...genres, ...themes, ...formats, ...sources, ...contentRatings].filter(
    (c) => c.state !== "none"
  );

  return {
    genres, setGenres,
    themes, setThemes,
    formats, setFormats,
    sources, setSources,
    contentRatings, setContentRatings,
    matchAll, setMatchAll,
    searchQuery, setSearchQuery,
    cycleChip,
    selectedCount,
    genreCount, formatCount, sourceCount, contentRatingCount,
    resetAll,
    activeFilters,
  };
}
