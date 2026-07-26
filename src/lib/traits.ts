import type { Mood } from "@/lib/contract";

export function buildInitialTraits(input: { age: number; gender: string; mood: Mood }) {
  return {
    communicationStyle: input.mood === "rough" || input.mood === "low" ? "gentle" : "encouraging",
    motivationStyle: input.age < 30 ? "progress" : "support",
  };
}

export async function analyzeVisionBoard(_imageDataUrl: string): Promise<{ themes: string[] }> {
  // Vision-capable provider work is optional; return an honest unavailable
  // signal until the image pipeline is configured.
  return { themes: [] };
}
