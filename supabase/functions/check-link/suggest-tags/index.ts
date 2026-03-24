import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { synopsis, title, existingTags } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a manga/manhwa/manhua tag suggestion assistant. Given a story title and synopsis, suggest relevant genre and theme tags. Return ONLY a JSON array of tag strings, no explanation, no markdown. Tags should be common genres/themes like: Action, Adventure, Comedy, Drama, Fantasy, Horror, Isekai, Martial Arts, Mystery, Psychological, Romance, School Life, Sci-Fi, Seinen, Shoujo, Shounen, Slice of Life, Supernatural, Thriller, Tragedy, Villainess, Reincarnation, System, Cultivation, Regression, etc. Suggest 3-8 tags. Do not suggest tags already in the existing tags list.

Title: ${title}
Synopsis: ${synopsis || "No synopsis available"}
Existing tags: ${(existingTags || []).join(", ") || "None"}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    let tags: string[] = [];
    try {
      tags = JSON.parse(text);
    } catch {}

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});