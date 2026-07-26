import path from "path";
import { RocketRideClient } from "rocketride";

export interface VisionBoardInsight {
  themes: string[];
  communicationStyle?: "direct" | "encouraging" | "playful";
  motivationStyle?: "achievement" | "support" | "competition";
  suggestedFirstGoal?: string;
}

function parseInsight(value: unknown): VisionBoardInsight {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
    themes?: unknown;
    communicationStyle?: unknown;
    motivationStyle?: unknown;
    suggestedFirstGoal?: unknown;
  };
  return {
    themes: Array.isArray(parsed.themes)
      ? parsed.themes.filter((theme): theme is string => typeof theme === "string").map((theme) => theme.trim().toLowerCase()).filter(Boolean).slice(0, 5)
      : [],
    communicationStyle: ["direct", "encouraging", "playful"].includes(String(parsed.communicationStyle))
      ? parsed.communicationStyle as VisionBoardInsight["communicationStyle"]
      : undefined,
    motivationStyle: ["achievement", "support", "competition"].includes(String(parsed.motivationStyle))
      ? parsed.motivationStyle as VisionBoardInsight["motivationStyle"]
      : undefined,
    suggestedFirstGoal: typeof parsed.suggestedFirstGoal === "string" ? parsed.suggestedFirstGoal.slice(0, 200) : undefined,
  };
}

export async function analyzeVisionBoardWithRocketRide(imageDataUrl: string): Promise<VisionBoardInsight> {
  const uri = process.env.ROCKETRIDE_URI;
  const auth = process.env.ROCKETRIDE_AUTH;
  if (!uri || !auth) throw new Error("RocketRide is not configured");

  const [header, payload] = imageDataUrl.split(",", 2);
  if (!header || !payload) throw new Error("Invalid vision board image");
  const mimeType = header.match(/^data:([^;]+);base64$/)?.[1] ?? "image/jpeg";
  const client = new RocketRideClient({
    env: { ROCKETRIDE_URI: uri, ROCKETRIDE_APIKEY: auth },
  });

  try {
    await client.connect();
    const task = await client.use({
      filepath: path.join(process.cwd(), "pipelines/vision-board-insight.pipe"),
      name: "TinyWins vision board insight",
      pipelineTraceLevel: "summary",
    });
    const result = await client.send(
      task.token,
      Buffer.from(payload, "base64"),
      { filename: "vision-board" },
      mimeType
    );
    await client.terminate(task.token);
    return parseInsight(result);
  } finally {
    await client.disconnect();
  }
}
