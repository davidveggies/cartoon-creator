/**
 * Local dev API for AI script generation.
 * Run: npm run dev:api  (port 3001)
 * Vite proxies /api → localhost:3001
 */
import { createServer } from "node:http";

const PORT = Number(process.env.API_PORT ?? 3001);

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== "/api/generate-script" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error:
          "Set OPENAI_API_KEY in your environment, or paste a screenplay directly.",
      })
    );
    return;
  }

  let body = "";
  for await (const chunk of req) body += chunk;

  try {
    const parsed = JSON.parse(body) as {
      idea?: string;
      cast?: { name: string }[];
      sceneCount?: number;
    };

    const idea = parsed.idea?.trim();
    if (!idea) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing story idea." }));
      return;
    }

    const castNames = (parsed.cast ?? []).map((c) => c.name.trim()).filter(Boolean);
    const sceneCount = Math.min(Math.max(parsed.sceneCount ?? 2, 1), 6);
    const castLine =
      castNames.length > 0
        ? `Use these character names exactly: ${castNames.join(", ")}.`
        : "Invent 2–4 character names.";

    const systemPrompt = `You write short cartoon screenplays for children. Output ONLY the screenplay text — no markdown fences, no commentary.

Format rules:
- Scene headers: --- Scene: Title ---
- Optional background hint: background: city
- Dialogue: SPEAKER: What they say
- Stage directions: [enter Name inner-left], [enter Name inner-right], [exit Name], [Name shakes]
- Include a Narrator line to open each scene
- ${castLine}
- Write ${sceneCount} scene(s)`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.85,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: idea },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      res.writeHead(response.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: data.error?.message ?? "OpenAI request failed" }));
      return;
    }

    const screenplay = data.choices?.[0]?.message?.content?.trim();
    if (!screenplay) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "AI returned an empty script." }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ screenplay }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
}).listen(PORT, () => {
  console.log(`Creator API listening on http://localhost:${PORT}`);
});
