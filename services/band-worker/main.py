"""Persistent Band Goal Room workers.

The web service remains the source of truth for Prisma. These remote agents
only receive @mentions from Band and post signed callbacks to the web service.
"""

import asyncio
import hashlib
import hmac
import json
import os
import urllib.request

from band import Agent
from band.core.protocols import AgentToolsProtocol
from band.core.simple_adapter import SimpleAdapter
from band.core.types import PlatformMessage


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def post_internal(path: str, payload: dict) -> None:
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
    with urllib.request.urlopen(request, timeout=20):
        pass


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
        post_internal(
            "/api/internal/band/coach-event",
            {"roomId": room_id, "content": content},
        )
        await tools.send_event(
            "Goal Coach received a Goal Room event.",
            "thought",
            {"roomId": room_id, "kind": "coach_event"},
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

        post_internal(
            "/api/internal/band/reflections",
            {"roomId": room_id, **payload},
        )
        await tools.send_event(
            "Reflection Guide requested a persisted goal reflection.",
            "thought",
            {"roomId": room_id, "kind": "reflection_requested"},
        )


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
