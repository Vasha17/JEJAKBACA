import { createServer } from "http";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  let body = "";
  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const { url } = JSON.parse(body);
      if (!url) {
        res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "URL required" }));
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)" },
          redirect: "follow",
        });

        clearTimeout(timeout);

        res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({
          url,
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        }));
      } catch (fetchErr) {
        res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({
          url,
          status: 0,
          ok: false,
          statusText: fetchErr instanceof Error ? fetchErr.message : "Connection failed",
        }));
      }
    } catch (e) {
      console.error("check-link error:", e);
      res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }));
    }
  });
});

server.listen(8080);
