"""Persistent Band Goal Room workers.

The web service remains the source of truth for Prisma. These remote agents
only receive @mentions from Band and post signed callbacks to the web service.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import urllib.request

logging.basicConfig(level=os.environ.get("BAND_LOG_LEVEL", "INFO"))

from band import Agent
from band.core.protocols import AgentToolsProtocol
from band.core.simple_adapter import SimpleAdapter
from band.core.types import PlatformMessage


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def post_internal(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode()
    signature = hmac.new(
        env("INTERNAL_WEBHOOK_SECRET").encode(), body, hashlib.sha256
    ).hexdigest()
    request = urllib.request.Request(
        f"{env('TINY_WINS_WEB_URL').rstrip('/')}{path}",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-TinyWins-Signature": signature,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        try:
            return json.loads(response.read().decode() or "{}")
        except json.JSONDecodeError:
            return {}


class GoalCoachAdapter(SimpleAdapter):
    """Mirrors Goal Coach room mentions into the durable Goal Room timeline."""

    async def on_message(
        self,
        msg: PlatformMessage,
        tools: AgentToolsProtocol,
        history,
        participants_msg,
        contacts_msg,
        *,
        is_session_bootstrap: bool,
        room_id: str,
    ) -> None:
        content = msg.format_for_llm()
        try:
            post_internal(
                "/api/internal/band/coach-event",
                {"roomId": room_id, "content": content},
            )
        except Exception as error:
            await tools.send_message(
                f"Goal Coach can't reach TinyWins right now ({error}).",
                mentions=[{"id": msg.sender_id}],
            )
            return
        await tools.send_message(
            "Logged — this moment is on your Goal Room timeline. Keep going.",
            mentions=[{"id": msg.sender_id}],
        )


class ReflectionAdapter(SimpleAdapter):
    """Requests a web-owned reflection synthesis for a check-in mention."""

    async def on_message(
        self,
        msg: PlatformMessage,
        tools: AgentToolsProtocol,
        history,
        participants_msg,
        contacts_msg,
        *,
        is_session_bootstrap: bool,
        room_id: str,
    ) -> None:
        try:
            payload = json.loads(msg.content)
        except (TypeError, json.JSONDecodeError):
            payload = {"content": msg.format_for_llm()}

        # The web decides what the agent says; a web outage becomes a labeled
        # line in the room, never an adapter crash. Replies are chat messages —
        # send_event types are hidden behind Band's event-type filter.
        try:
            result = post_internal(
                "/api/internal/band/reflections",
                {"roomId": room_id, **payload},
            )
        except Exception as error:
            await tools.send_message(
                f"Reflection Guide can't reach TinyWins right now ({error}).",
                mentions=[{"id": msg.sender_id}],
            )
            return

        reply = (result or {}).get("reply") or "Reflection Guide received the check-in."
        await tools.send_message(reply, mentions=[{"id": msg.sender_id}])


async def main() -> None:
    coach = Agent.create(
        adapter=GoalCoachAdapter(history_converter=None),
        agent_id=env("BAND_COACH_AGENT_ID"),
        api_key=env("BAND_COACH_API_KEY"),
    )
    reflection = Agent.create(
        adapter=ReflectionAdapter(history_converter=None),
        agent_id=env("BAND_REFLECTION_AGENT_ID"),
        api_key=env("BAND_REFLECTION_API_KEY"),
    )
    await asyncio.gather(coach.run(), reflection.run())


if __name__ == "__main__":
    asyncio.run(main())
