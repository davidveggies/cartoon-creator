interface GenerateBody {
  idea?: string;
  cast?: { name: string }[];
  sceneCount?: number;
}

/** Vercel serverless handler for AI script generation. */
export default async function handler(
  req: { method?: string; body?: GenerateBody },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader?: (name: string, value: string) => void;
  }
) {
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        "AI script generation is not configured. Set OPENAI_API_KEY on your host, or paste a screenplay directly (TONY: Hello).",
    });
  }

  const body = req.body as GenerateBody;
  const idea = body.idea?.trim();
  if (!idea) {
    return res.status(400).json({ error: "Missing story idea." });
  }

  const castNames = (body.cast ?? []).map((c) => c.name.trim()).filter(Boolean);
  const sceneCount = Math.min(Math.max(body.sceneCount ?? 2, 1), 6);

  const castLine =
    castNames.length > 0
      ? `Use these character names exactly: ${castNames.join(", ")}.`
      : "Invent 2–4 character names.";

  const systemPrompt = `You write short cartoon screenplays for children. Output ONLY the screenplay text — no markdown fences, no commentary.

Format rules:
- Scene headers: --- Scene: Title ---
- Optional background hint on its own line: background: city
- Dialogue lines: SPEAKER: What they say
- Stage directions in brackets: [enter Name inner-left], [enter Name inner-right], [exit Name], [Name shakes]
- Include a Narrator line to open each scene
- Keep it fun, short, and visual
- ${castLine}
- Write ${sceneCount} scene(s)`;

  try {
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
      return res.status(response.status).json({
        error: data.error?.message ?? "OpenAI request failed",
      });
    }

    const screenplay = data.choices?.[0]?.message?.content?.trim();
    if (!screenplay) {
      return res.status(502).json({ error: "AI returned an empty script." });
    }

    return res.status(200).json({ screenplay });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
