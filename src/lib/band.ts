const BAND_AGENT_BASE_URL = "https://app.band.ai/api/v1/agent";

async function bandRequest<T>(
  path: string,
  init: RequestInit = {},
  apiKey = process.env.BAND_COACH_API_KEY
): Promise<T> {
  if (!apiKey) throw new Error("BAND_COACH_API_KEY not set");
  const response = await fetch(`${BAND_AGENT_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Band API error ${response.status}: ${await response.text()}`);
  }
  const body = (await response.json()) as { data: T };
  return body.data;
}

export async function createBandGoalRoom(title: string): Promise<string> {
  const room = await bandRequest<{ id: string }>("/chats", {
    method: "POST",
    body: JSON.stringify({ chat: { title: `TinyWins · ${title}` } }),
  });

  const reflectionAgentId = process.env.BAND_REFLECTION_AGENT_ID;
  if (!reflectionAgentId) throw new Error("BAND_REFLECTION_AGENT_ID not set");

  await bandRequest(`/chats/${room.id}/participants`, {
    method: "POST",
    body: JSON.stringify({ participant: { participant_id: reflectionAgentId } }),
  });
  return room.id;
}

export async function sendBandRoomMessage(input: {
  roomId: string;
  content: string;
  mentions: string[];
}) {
  return bandRequest(`/chats/${input.roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: { content: input.content, mentions: input.mentions } }),
  });
}
