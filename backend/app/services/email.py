"""
Transactional email via Resend (https://resend.com).

Environment variables:
  RESEND_API_KEY  — Resend API key
  EMAIL_FROM      — verified sender, e.g. "Esportorium <noreply@esportorium.com>"

If either is missing the send is skipped (logged as a warning), so the app keeps
working in local/dev without email configured — same pattern as Discord webhooks.

Testing note: with the onboarding@resend.dev sender, Resend only delivers to your
own Resend account email. To email arbitrary organisers, verify a domain at
resend.com/domains and use an address on that domain.
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

# ── Brand palette (mirrors the site's design tokens) ──────────────────────────
_BRAND = "#B5522A"   # terracotta
_BG = "#FAFAF8"      # warm white
_TEXT = "#1A1A1A"    # charcoal
_MUTED = "#6B6B6B"
_BORDER = "#E5E3DF"
LOGO_URL = "https://esportorium.com/esportorium-logo.png"

_P = f"margin:0 0 14px;font-size:15px;line-height:1.6;color:{_TEXT}"


async def _send(to: str, subject: str, html: str) -> None:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("EMAIL_FROM", "").strip()
    if not api_key or not sender:
        logger.warning("Resend not configured (RESEND_API_KEY / EMAIL_FROM) — skipping email to %s", to)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={"from": sender, "to": [to], "subject": subject, "html": html},
            )
        if resp.status_code >= 400:
            # Surface Resend's reason (e.g. unverified domain, testing-mode restriction).
            logger.warning("Resend rejected email to %s: %s %s", to, resp.status_code, resp.text)
        else:
            logger.info("Resend email sent to %s (id=%s)", to, resp.json().get("id"))
    except Exception as exc:
        logger.warning("Resend request failed for %s: %s", to, exc)


def _button(href: str, label: str) -> str:
    return (
        f'<a href="{href}" style="display:inline-block;background:{_BRAND};color:#ffffff;'
        f'text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;'
        f'font-size:15px">{label}</a>'
    )


def _wrap(title: str, body_html: str) -> str:
    """Branded HTML shell. Logo sits on warm-white — never on terracotta (clash)."""
    return f"""\
<div style="background:{_BG};padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid {_BORDER};border-radius:12px;overflow:hidden">
    <div style="padding:28px 28px 0;text-align:center">
      <img src="{LOGO_URL}" alt="Esportorium" width="56" height="56" style="border-radius:10px;display:inline-block">
      <div style="height:3px;width:48px;background:{_BRAND};margin:16px auto 0;border-radius:2px"></div>
    </div>
    <div style="padding:24px 28px 28px">
      <h2 style="margin:0 0 16px;font-size:19px;color:{_TEXT}">{title}</h2>
      {body_html}
    </div>
    <div style="padding:18px 28px;border-top:1px solid {_BORDER};background:{_BG}">
      <p style="margin:0;font-size:12px;line-height:1.6;color:{_MUTED};text-align:center">
        Esportorium — Malaysia Esports Tournaments<br>
        You received this email because you submitted a tournament for listing.
      </p>
    </div>
  </div>
</div>"""


async def send_approval_email(
    to: str, title: str, registration_link: str, start_date: str, tournament_url: str
) -> None:
    """Notify an organiser that their tournament has been approved and listed."""
    body = f"""\
    <p style="{_P}">Good news! Your tournament <strong>{title}</strong> has been approved and is
    now live on Esportorium. 🎉</p>
    <p style="{_P}">📅 <strong>Starts:</strong> {start_date}</p>
    <div style="margin:24px 0;text-align:center">{_button(tournament_url, "View your listing")}</div>
    <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:{_MUTED}">
      Registration link players will use:
      <a href="{registration_link}" style="color:{_BRAND}">{registration_link}</a>
    </p>
    <p style="{_P}">Players can now discover and register for your event. Good luck!</p>"""
    await _send(to, f'✅ Your tournament "{title}" is now live on Esportorium', _wrap("Tournament Approved", body))


async def send_rejection_email(to: str, title: str) -> None:
    """Notify an organiser that their submission was not approved."""
    body = f"""\
    <p style="{_P}">Thank you for submitting <strong>{title}</strong> to Esportorium.</p>
    <p style="{_P}">After review, we're unable to list this tournament at this time. This can happen
    if details were incomplete, the event couldn't be verified, or it fell outside our current scope
    (Mobile Legends tournaments in Malaysia).</p>
    <div style="margin:24px 0;text-align:center">{_button("https://esportorium.com/submit", "Submit again")}</div>
    <p style="{_P}">You're welcome to submit again with updated details.</p>"""
    await _send(to, f'Update on your tournament submission "{title}"', _wrap("Submission Not Approved", body))
