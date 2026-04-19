# KREIS

> Tool für enge Menschen — gemeinsam entscheiden, ob wir was machen.

**Live:** [1gassner.github.io/kreis](https://1gassner.github.io/kreis/)

## Was KREIS ist

Ein kleines, intimes Tool für deinen engen Freundeskreis (5-7 Leute), um zu entscheiden, ob ihr zu einem Event geht. Keine Algorithmen. Keine Empfehlungen. Kein öffentlicher Feed.

**V1-Kern:** *"Hey, wanna go?"* + Voting + Live-Status.

**V2/V3-Ausbau (19.04.2026, aktuell in UX-Review):**
- personalisierte **AI-Einladungen** mit Fotos der Gäste
- eigener **Einladungs-Song** (Suno V4)
- **Einladungs-Film** (HTML5-Slideshow + MP4)
- **Gast-Wizard** für Mit-Produktion (Foto + Story-Beiträge)
- **Ehrengast-Modus** für Überraschungs-Einladungen mit Token-Link

> ⚠️ Der V3-Studio-Teil ist aktuell Bestandteil der Haupt-UI. Ein **Split in RSVP-App + optionales Studio-Feature** wird gerade überlegt (siehe `KREIS_Konzept.md`).

## Features

- **Natural Language Input** — Tipp "Klettern Reutlingen nächsten Samstag mit Nino und Cindy", Claude Haiku parsed es.
- **Voting** — 🟢 Dabei / 🟡 Vielleicht / 🔴 Nicht dabei + Note
- **Live-Refresh** 8s-Poll, **My Events** in localStorage
- **WhatsApp-1-Klick-Share**, **ICS-Export**, **Web Share API**, **PWA-Manifest**
- **PDA-safe** — keine Pushes, keine Deadlines, keine Shame-Mechanik
- **Dark mode only**, Celestial-Void Design-System

## Stack

- **Frontend:** Single-file HTML + Tailwind (CDN) + Inter Tight + JetBrains Mono + vanilla JS (~2400 LOC, kein Build-Step)
- **Backend:** Supabase Postgres + 6 Edge Functions (Deno)
- **AI-Stack:**
  - Claude Haiku 4.5 (NL-Parsing, Scene-Planning, Lyrics, Identity-Judge)
  - Gemini 3 Pro Image (Nano Banana Pro) — 4 Scenes parallel
  - Suno V4 — Song-Generation via Callback
  - ffmpeg.wasm — client-side MP4-Render
- **Hosting:** GitHub Pages (kostenlos, automatische SSL)

## V3 Backend-Flow

```
1. Gast macht Wizard (RSVP → Foto → Story)
        ↓
2. Frontend → kreis-auto-render {event_id}
        ↓
3. Gate-Checks: threshold, render_count < 3, faces available
        ↓
4. Atomic lock, fire compose-invite + compose-song parallel
        ↓
5. Scenes (4× Gemini Pro) + Song (Suno V4) fertig
        ↓
6. Creator sieht "FILM IST BEREIT" im Dashboard
        ↓
7. Creator klickt EINLADUNG SENDEN → 2 Optionen:
   - Token-Link an Ehrengast (Film-Viewer)
   - Wizard-Link an Freundeskreis (weitere Mitmacher)
```

## Edge Functions

| Slug | Version | Zweck |
|------|---------|-------|
| `kreis-parse-event` | v4 | NL → Event-JSON |
| `kreis-compose-invite` | v5 | 4× Gemini Pro + Identity-Judge + stories + guest_of_honor mode |
| `kreis-compose-song` | v8 | Claude Lyrics + Suno V4 + story-integration |
| `kreis-auto-render` | v2 | Orchestrator (atomic lock + 3-render cap + threshold-gate) |
| `kreis-honoree-view` | v1 | Token-basierter Ehrengast-Payload |
| `kreis-suno-callback` | v2 | Suno-Webhook |

## Kosten

- Hosting: 0 €
- Supabase: Free Tier
- AI-Calls pro Render: **~$0.60** (4 Scenes + Judge + Lyrics + Song)
- Max 3 Renders pro Event (hard cap): **~$1.80**
- NL-Parse only: ~$0.0005

## Datenmodell

```sql
kreis_events(
  id uuid, title, location, date_start, date_end, link, note,
  created_by, created_at, archived,
  guest_of_honor, share_token (UNIQUE), film_shared_at,
  render_count, last_rendered_at,
  auto_render_threshold, auto_render_triggered_at
)
kreis_responses(
  id, event_id, user_name, response, note, created_at, updated_at,
  story_text, wizard_completed, wizard_step
)
kreis_faces(id, event_id, user_name, storage_path, consent_given, created_at)
kreis_generated(id, event_id, kind, url, meta jsonb, created_at)
```

## Entwicklung

```bash
python3 -m http.server 8094 --directory .
open http://localhost:8094/
```

### Edge Functions deploy (via Supabase MCP oder CLI)

```bash
supabase functions deploy kreis-parse-event --no-verify-jwt
supabase functions deploy kreis-compose-invite --no-verify-jwt
supabase functions deploy kreis-compose-song --no-verify-jwt
supabase functions deploy kreis-auto-render --no-verify-jwt
supabase functions deploy kreis-honoree-view --no-verify-jwt
supabase functions deploy kreis-suno-callback --no-verify-jwt
```

### Required Supabase Secrets

- `ANTHROPIC_API_KEY` — Claude Haiku
- `GEMINI_API_KEY` — Gemini 3 Pro Image
- `SUNO_API_KEY` — Suno V4 (via apibox.erweima.ai)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (auto, für Edge-Function internal calls)

## Datenschutz

Keine Nutzer-Accounts, kein Tracking, kein Analytics.

Einzige gespeicherte Daten:
- Eventdaten (Titel, Datum, Ort, Notiz, optional guest_of_honor) in Supabase EU-West
- Abstimmungen mit Namen (selbst eingegeben), optional story_text
- Eigene erstellte Events in Browser-localStorage
- Face-Uploads in Supabase Storage mit `consent_given`-Flag (2h signed URLs)
- Generierte Assets (Scenes + Song) in Public-Bucket

Event-Creator kann Events jederzeit löschen — Responses + Faces + Generated-Assets cascade mit.

## Konzept-Doku

Tiefer Einstieg: `KREIS_Konzept.md` (inkl. aktuelle UX-Design-Entscheidung)
Next-Session-Prompt: `NEXT_SESSION_PROMPT.md`

## Lizenz

MIT. Privates Tool, kein Support. Baut euch euren Kreis.

---

**Scratch your own itch.**
