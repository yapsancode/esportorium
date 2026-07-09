"""
Notification helpers — Discord webhooks.

Environment variables:
  DISCORD_WEBHOOK_URL         — private admin channel (new submissions, rejections)
  DISCORD_PUBLIC_WEBHOOK_URL  — public community channel (tournament approvals)

Leave either blank to skip that notification.
"""
import logging
import os
import httpx

logger = logging.getLogger(__name__)

_TERRACOTTA = 11874858   # #B5522A in decimal
_GREEN       = 3066993   # #2ECC71
_RED         = 15158332  # #E74C3C


async def _post(url: str, payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("Discord webhook failed: %s", exc)


async def notify_discord_new_submission(
    title: str, organiser: str | None, format_: str | None, state: str | None
) -> None:
    """Notify admin channel when a new tournament submission arrives."""
    url = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
    if not url:
        return

    location = state if state else "Online"
    await _post(url, {
        "username": "Esportorium Bot",
        "embeds": [{
            "title": "🎮 New Tournament Submission",
            "color": _TERRACOTTA,
            "fields": [
                {"name": "Title",     "value": title,                                            "inline": True},
                {"name": "Organiser", "value": organiser or "Not specified",                      "inline": True},
                {"name": "Format",    "value": format_.capitalize() if format_ else "Not specified", "inline": True},
                {"name": "Location",  "value": location,                                          "inline": True},
            ],
            "footer": {"text": "Review at esportorium.com/admin/dashboard"},
        }],
    })


async def notify_discord_tournament_approved(
    tournament_id: str,
    title: str,
    organiser: str,
    format_: str | None,
    state: str | None,
    prize_pool_rm: int | None,
    start_date: str,
    registration_link: str | None,
    banner_image: str | None,
) -> None:
    """Announce an approved tournament to the public community channel.
    Falls back to the admin webhook if no public webhook is configured."""
    public_url  = os.getenv("DISCORD_PUBLIC_WEBHOOK_URL", "").strip()
    admin_url   = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
    url = public_url or admin_url
    if not url:
        return

    location = state if state else "Online"
    format_label = format_.capitalize() if format_ else "TBD"
    prize_label = f"RM {prize_pool_rm:,}" if prize_pool_rm is not None else "TBD"
    tournament_url = f"https://esportorium.com/tournament/{tournament_id}"

    embed: dict = {
        "title": f"✅ {title}",
        "url": tournament_url,
        "color": _GREEN,
        "description": "A new **Mobile Legends** tournament has been listed on Esportorium!",
        "fields": [
            {"name": "Organiser",  "value": organiser,              "inline": True},
            {"name": "Format",     "value": f"{format_label} · {location}", "inline": True},
            {"name": "Prize Pool", "value": prize_label,            "inline": True},
            {"name": "Starts",     "value": start_date,             "inline": True},
            {"name": "Register",   "value": registration_link or "TBD", "inline": False},
        ],
        "footer": {"text": "esportorium.com — Malaysia Esports Tournaments"},
    }
    if banner_image:
        embed["image"] = {"url": banner_image}

    await _post(url, {"username": "Esportorium Bot", "embeds": [embed]})


async def notify_discord_tournament_rejected(title: str, organiser: str) -> None:
    """Notify admin channel when a submission is rejected."""
    url = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
    if not url:
        return

    await _post(url, {
        "username": "Esportorium Bot",
        "embeds": [{
            "title": "❌ Submission Rejected",
            "color": _RED,
            "fields": [
                {"name": "Title",     "value": title,     "inline": True},
                {"name": "Organiser", "value": organiser, "inline": True},
            ],
            "footer": {"text": "Submission removed from the queue."},
        }],
    })
