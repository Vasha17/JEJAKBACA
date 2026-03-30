// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Daftar tag manual (karena database dihilangkan)
// Bisa tambahin/kurangin tag di sini sesuka hati
const MANUAL_TAGS = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", 
  "Romance", "Sci-Fi", "Slice of Life", "Sports", "Thriller", "Isekai", 
  "Magic", "Martial Arts", "Supernatural", "Gore", "Psychological", 
  "School Life", "Shounen", "Seinen", "Josei", "Shoujo"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, synopsis, existingTags } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ tags: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- BAGIAN YANG DIHAPUS: Koneksi Supabase & Fetch base_tags ---
    // Kita langsung pakai MANUAL_TAGS di atas
    
    if (MANUAL_TAGS.length === 0) {
       return new Response(
        JSON.stringify({ tags: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ tags: [], error: "GROQ_API_KEY secret is not set" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const prompt = `You are a manga/manhwa/novel tagging assistant.

Story Information:
Title: ${title}
 ${synopsis ? `Synopsis: ${synopsis}` : ""}
 ${existingTags?.length ? `Already has these tags (do NOT suggest these again): ${existingTags.join(", ")}` : ""}

TASK:
Suggest 3 to 6 relevant tags for this story.
CRITICAL CONSTRAINT: You MUST strictly choose tags from the list below. Do not invent new tags.

Available Tags List:
 ${MANUAL_TAGS.join(", ")}

Return ONLY a valid JSON array of tag strings, no explanation, no markdown, no code block.
Example: ["Action", "Fantasy"]`;
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", 
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, 
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq error:", errText);
      return new Response(
        JSON.stringify({ tags: [], error: `Groq Error: ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim() ?? "[]";
    console.log("Raw AI Text:", rawText);

    let suggestedTags: string[] = [];
    try {      
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      suggestedTags = JSON.parse(cleaned);
      if (!Array.isArray(suggestedTags)) suggestedTags = [];
    } catch (e) {
      console.error("Parse error:", e);
      suggestedTags = [];
    }
 
    // Validasi: Pastikan tag yang direkomendasi AI ada di list MANUAL_TAGS kita
    const finalTags = suggestedTags.filter((tag: string) => {
      return MANUAL_TAGS.some(manualTag => manualTag.toLowerCase() === tag.toLowerCase());
    });
    
    // Hapus tag yang sudah ada sebelumnya (deduplikasi)
    const uniqueTags = finalTags.filter(tag => 
      !existingTags?.some((existing: string) => existing.toLowerCase() === tag.toLowerCase())
    );

    return new Response(
      JSON.stringify({ tags: uniqueTags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("suggest-tags error:", err);
    return new Response(
      JSON.stringify({ tags: [], error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});