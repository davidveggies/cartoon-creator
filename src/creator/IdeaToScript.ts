export interface GenerateScriptRequest {
  idea: string;
  cast: { name: string }[];
  sceneCount?: number;
}

export interface GenerateScriptResponse {
  screenplay: string;
}

export async function ideaToScreenplay(req: GenerateScriptRequest): Promise<string> {
  const res = await fetch("/api/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const body = (await res.json()) as GenerateScriptResponse & { error?: string };

  if (!res.ok) {
    throw new Error(body.error ?? `Script generation failed (${res.status})`);
  }

  if (!body.screenplay?.trim()) {
    throw new Error("AI returned an empty script.");
  }

  return body.screenplay.trim();
}
