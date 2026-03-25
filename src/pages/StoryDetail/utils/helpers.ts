// localStorage helpers
export const lsGet = <T,>(key: string, fb: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fb; } catch { return fb; }
};
export const lsSet = (key: string, v: unknown) =>
  localStorage.setItem(key, JSON.stringify(v));

export const normalizeTag = (t: string) => t.trim().toUpperCase();

export const haptic = (style: "light" | "medium" | "heavy" = "light") => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(style === "light" ? 10 : style === "medium" ? 25 : 50);
  }
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

export const base64ToFile = (base64: string, filename: string): File => {
  const arr  = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};

// Arc localStorage helpers
export const arcKey    = (sid: string) => `story_arcs_${sid}`;
export const loadArcs  = (sid: string) => lsGet<Arc[]>(arcKey(sid), []);
export const saveArcs  = (sid: string, arcs: Arc[]) => lsSet(arcKey(sid), arcs);

// Arc type (shared)
export type Arc = {
  id: string;
  name: string;
  chapterStart: number;
  chapterEnd: number | null;
  description: string;
  color: string;
  createdAt: string;
};

const safeGet = <T,>(key: string, defaultValue: T): T => {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn("Storage blocked (Incognito?):", e);
    return defaultValue;
  }
};