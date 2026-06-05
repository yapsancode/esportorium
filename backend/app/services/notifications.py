"""
Notification helpers — Discord webhook and (later) Resend email.

Environment variables required:
  DISCORD_WEBHOOK_URL   — private Discord channel webhook URL
                          Leave blank to disable (no webhook is sent).
"""
import logging
import os
import httpx

logger = logging.getLogger(__name__)


async def notify_discord_new_submission(title: str, organiser: str, format_: str, state: str | None) -> None:
    """Fire-and-forget: post a message to the Discord webhook when a new
    tournament submission arrives.  Silently skips if the env var is unset."""
    url = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
    if not url:
        return

    location = f"{state}" if state else "Online"
    payload = {
        "username": "Esportorium Bot",
        "embeds": [
            {
                "title": "🎮 New Tournament Submission",
                "color": 11874858,   # terracotta #B5522A in decimal
                "fields": [
                    {"name": "Title",      "value": title,      "inline": True},
                    {"name": "Organiser",  "value": organiser,  "inline": True},
                    {"name": "Format",     "value": format_.capitalize(), "inline": True},
                    {"name": "Location",   "value": location,   "inline": True},
                ],
                "footer": {"text": "Review at esportorium.com/admin/dashboard"},
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        # Never let a notification failure block the submission response
        logger.warning("Discord webhook failed: %s", exc)
