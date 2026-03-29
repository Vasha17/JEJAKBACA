const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TYPES
interface StoryMeta {
  title: string;
  altTitle: string;
  author: string;
  cover: string;
  description: string;
  genre: string[];
  tags: string[];
  demographic: string;
  country: string;
  whereToRead: string;
}

// UTILS
function detectDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function extractIdFromUrl(url: string, pattern: RegExp): string {
  const match = url.match(pattern);
  return match?.[1] ?? "";
}

// 1. MANGADEX API
async function fetchFromMangaDex(url: string): Promise<StoryMeta> {
  const mangaId = extractIdFromUrl(url, /mangadex\.org\/title\/([a-f0-9-]{36})/);
  if (!mangaId) throw new Error("Cannot extract MangaDex ID from URL");

  const res = await fetch(
    `https://api.mangadex.org/manga/${mangaId}?includes[]=author&includes[]=artist&includes[]=cover_art`
  );
  if (!res.ok) throw new Error(`MangaDex API error: ${res.status}`);

  const { data } = await res.json();
  const attr = data.attributes;

  // Title
  const title =
    attr.title?.en ||
    attr.title?.ja ||
    Object.values(attr.title ?? {})[0] ||
    "Unknown";

  // Alt Titles 
  const altTitleList: string[] = [];
  for (const obj of (attr.altTitles ?? [])) {
    const val = obj["en"] || obj["ja-ro"] || Object.values(obj)[0];
    if (val && val !== title) altTitleList.push(val as string);
  }
  const altTitle = altTitleList.slice(0, 3).join(" / ") || "";

  // Author
  const authorRel = data.relationships?.find(
    (r: { type: string }) => r.type === "author"
  );
  const author = authorRel?.attributes?.name ?? "Unknown";

  // Cover
  const coverRel = data.relationships?.find(
    (r: { type: string }) => r.type === "cover_art"
  );
  const coverFile = coverRel?.attributes?.fileName ?? "";
  const cover = coverFile
    ? `https://uploads.mangadex.org/covers/${mangaId}/${coverFile}.256.jpg`
    : "";

  // Description
  const description =
    attr.description?.en ||
    attr.description?.ja ||
    Object.values(attr.description ?? {})[0] ||
    "";

  // Genres & Tags
  const allTags: string[] = (attr.tags ?? []).map(
    (t: { attributes: { name: { en?: string } } }) => t.attributes?.name?.en ?? ""
  ).filter(Boolean);

  const genreGroupNames = (attr.tags ?? [])
    .filter((t: { attributes: { group: string } }) => t.attributes?.group === "genre")
    .map((t: { attributes: { name: { en?: string } } }) => t.attributes?.name?.en ?? "")
    .filter(Boolean);

  const themeTagNames = (attr.tags ?? [])
    .filter((t: { attributes: { group: string } }) => t.attributes?.group === "theme")
    .map((t: { attributes: { name: { en?: string } } }) => t.attributes?.name?.en ?? "")
    .filter(Boolean);

  // Demographic
  const demographic = attr.publicationDemographic ?? "";  
  const countryMap: Record<string, string> = {
    ja: "JP",
    ko: "KR",
    zh: "CN",
    "zh-hk": "HK",
    "zh-tw": "TW",
    id: "ID",
    en: "US",
  };
  const country = countryMap[attr.originalLanguage ?? ""] ?? "";

  return {
    title,
    altTitle,
    author,
    cover,
    description: description as string,
    genre: genreGroupNames,
    tags: [...themeTagNames, ...allTags.filter(t => !genreGroupNames.includes(t) && !themeTagNames.includes(t))],
    demographic,
    country,
    whereToRead: url,
  };
}

// 2. JIKAN API (MyAnimeList)
async function fetchFromMAL(url: string): Promise<StoryMeta> {  
  const malId = extractIdFromUrl(url, /myanimelist\.net\/manga\/(\d+)/);
  if (!malId) throw new Error("Cannot extract MAL ID from URL");

  const res = await fetch(`https://api.jikan.moe/v4/manga/${malId}/full`);
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);

  const { data } = await res.json();

  const title = data.title ?? "Unknown";  
  const synonyms = (data.titles ?? [])
    .filter((t: { type: string; title: string }) => t.type === "Synonym" && t.title !== data.title)
    .map((t: { title: string }) => t.title)
    .slice(0, 3);
  const altTitle = [
    data.title_english !== data.title ? data.title_english : null,
    data.title_japanese !== data.title ? data.title_japanese : null,
    ...synonyms,
  ].filter(Boolean).slice(0, 3).join(" / ") || "";

  const author =
    data.authors?.map((a: { name: string }) => a.name).join(", ") ?? "Unknown";

  const cover = data.images?.jpg?.large_image_url ?? data.images?.jpg?.image_url ?? "";
  const description = data.synopsis ?? "";

  const genres: string[] = data.genres?.map((g: { name: string }) => g.name) ?? [];
  const themes: string[] = data.themes?.map((t: { name: string }) => t.name) ?? [];
  const _explicitGenres: string[] = data.explicit_genres?.map((g: { name: string }) => g.name) ?? [];

  const demographic = data.demographics?.[0]?.name ?? "";  
  const typeCountryMap: Record<string, string> = {
    Manga: "JP",
    Manhwa: "KR",
    Manhua: "CN",
    "Light Novel": "JP",
    Novel: "",
    "One-shot": "JP",
    Doujinshi: "JP",
  };
  const country = typeCountryMap[data.type ?? ""] ?? "";

  return {
    title,
    altTitle,
    author,
    cover,
    description,
    genre: genres,
    tags: themes,
    demographic,
    country,
    whereToRead: url,
  };
}

// 3. ANILIST GRAPHQL API
async function fetchFromAniList(url: string): Promise<StoryMeta> {  
  const anilistId = extractIdFromUrl(url, /anilist\.co\/manga\/(\d+)/);
  if (!anilistId) throw new Error("Cannot extract AniList ID from URL");

  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        title { romaji english native }
        synonyms
        staff(perPage: 5) { edges { role node { name { full } } } }
        coverImage { extraLarge large }
        description(asHtml: false)
        genres
        tags { name category isGeneralSpoiler }
        countryOfOrigin
        demographics: tags(sort: RANK_DESC) { name category }
      }
    }
  `;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: Number(anilistId) } }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);

  const { data } = await res.json();
  const media = data?.Media;
  if (!media) throw new Error("AniList: No media found");

  const title =
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Unknown";

  const altTitle =
    media.title?.romaji !== title
      ? media.title?.romaji
      : media.title?.native !== title
      ? media.title?.native
      : media.synonyms?.[0] ?? "";

  const authorEdge = media.staff?.edges?.find(
    (e: { role: string }) =>
      e.role?.toLowerCase().includes("story") || e.role?.toLowerCase().includes("author")
  );
  const author = authorEdge?.node?.name?.full ?? "Unknown";

  const cover = media.coverImage?.extraLarge ?? media.coverImage?.large ?? "";
  const description = media.description ?? "";
  const genres: string[] = media.genres ?? [];

  const tags: string[] = (media.tags ?? [])
    .filter((t: { isGeneralSpoiler: boolean; category: string }) => !t.isGeneralSpoiler)
    .map((t: { name: string }) => t.name);

  // Demographic 
  const demographicTag = (media.tags ?? []).find(
    (t: { category: string }) => t.category === "Demographic"
  );
  const demographic = demographicTag?.name ?? "";  
  const country = media.countryOfOrigin ?? "";

  return {
    title,
    altTitle,
    author,
    cover,
    description,
    genre: genres,
    tags,
    demographic,
    country,
    whereToRead: url,
  };
}

// 4. GROQ AI FALLBACK (untuk situs lain)
async function fetchWithGroqFallback(url: string): Promise<StoryMeta> {  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();  
  const trimmedHtml = html.slice(0, 15000);

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) throw new Error("GROQ_API_KEY not set");

  const prompt = `You are a metadata extractor. Given the HTML of a manga/manhwa/webtoon/novel website, extract structured info.

Return ONLY a valid JSON object with these exact keys (no markdown, no explanation):
{
  "title": "main title",
  "altTitle": "alternative/translated title or empty string",
  "author": "author name or Unknown",
  "cover": "cover image URL or empty string",
  "description": "synopsis/description or empty string",
  "genre": ["array", "of", "genres"],
  "tags": ["array", "of", "tags"],
  "demographic": "Shounen/Shoujo/Seinen/Josei/Kids or empty string",
  "country": "ISO 2-letter country code: JP/KR/CN/TW/ID/US/etc. Empty string if unknown"
}

HTML:
${trimmedHtml}`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // langsung JSON, no strip needed
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    throw new Error(`Groq API error ${groqRes.status}: ${errText}`);
  }

  const groqData = await groqRes.json();
  const parsed = JSON.parse(groqData.choices[0].message.content);

  return {
    title: parsed.title ?? "Unknown",
    altTitle: parsed.altTitle ?? "",
    author: parsed.author ?? "Unknown",
    cover: parsed.cover ?? "",
    description: parsed.description ?? "",
    genre: Array.isArray(parsed.genre) ? parsed.genre : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    demographic: parsed.demographic ?? "",
    country: parsed.country ?? "International",
    whereToRead: url,
  };
}

// MAIN ROUTER
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) return Response.json({ error: "URL required" }, { status: 400, headers: corsHeaders });

    const domain = detectDomain(url);
    let meta: StoryMeta;

    if (domain.includes("mangadex.org")) {
      meta = await fetchFromMangaDex(url);
    } else if (domain.includes("myanimelist.net")) {
      meta = await fetchFromMAL(url);
    } else if (domain.includes("anilist.co")) {
      meta = await fetchFromAniList(url);
    } else {     
      meta = await fetchWithGroqFallback(url);
    }

    return Response.json(meta, { headers: corsHeaders });

  } catch (e) {
    console.error(e);
    return Response.json(
      { error: String(e) },
      { status: 500, headers: corsHeaders }
    );
  }
});