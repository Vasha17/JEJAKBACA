import { Story } from "./types";

const STORAGE_KEY = "jejakbaca_stories";

export function loadStories(): Story[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStories(stories: Story[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}
