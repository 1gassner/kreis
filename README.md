# KREIS

> Tool für enge Menschen — gemeinsam entscheiden, ob wir was machen.

**Live:** [1gassner.github.io/kreis](https://1gassner.github.io/kreis/)

## Was KREIS ist

Ein kleines, intimes Tool für deinen engen Freundeskreis (5-7 Leute), um zu entscheiden, ob ihr zu einem Event geht. Keine Algorithmen. Keine Empfehlungen. Kein öffentlicher Feed.

Nur: *"Hey, wanna go?"* + Voting + Live-Status.

Plus seit V2 (19.04.2026): personalisierte **AI-Einladungen** mit Fotos der Gäste + eigener **Einladungs-Song** + teilbarer **Einladungs-Film**.

- **Natural Language Input** — Tipp "Klettern Reutlingen nächsten Samstag mit Nino und Cindy", Claude Haiku parsed es.
- **AI-Einladung** — 4 personalisierte Bilder mit euren Gesichtern (Gemini 3 Pro "Nano Banana Pro")
- **Einladungs-Song** — Suno V4 generiert euren personalisierten Track auf Basis Event + Note
- **Einladungs-Film** — HTML5-Slideshow + MP4-Export, WhatsApp-ready
- **PDA-safe** — keine Pushes, keine Deadlines, keine Shame-Mechanik, keine Streaks
- **Mobile-first PWA** — installierbar auf iPhone-Homescreen
- **Dark mode only**, weil warme Abende

## Stack

- **Frontend:** Single-file HTML + Tailwind (CDN) + vanilla JS (~1900 LOC, kein Build-Step)
- **Backend:** Supabase Postgres + 4 Edge Functions (Deno)
- **AI-Stack:**
  - Claude Haiku 4.5 (NL-Parsing, Scene-Planning, Lyrics, Identity-Judge)
  - Gemini 3 Pro Image (Nano Banana Pro) — 4 Scenes parallel
  - Suno V4 — Song-Generation
  - ffmpeg.wasm — client-side MP4-Render
- **Hosting:** GitHub Pages (kostenlos, automatische SSL)

## Pipeline

```
Event erstellen (NL Input)
        ↓
[Claude Haiku] parsed → Event-DB-Row
        ↓
Face-Upload pro Gast (bis zu 4)
        ↓
[Claude] plant 4 Scenes + Description + Song-Hook
        ↓
[4× Gemini Pro parallel] generiert Bilder mit Identity-Refs
        ↓
[Claude-Judge] prüft Identity pro Scene, retry bei <6/10
        ↓
[Claude] schreibt Lyrics aus Event-Note + Guest-Namen
        ↓
[Suno V4] generiert 2-3 Min MP3
        ↓
Einladungs-Film: HTML5-Slideshow + MP4-Export
        ↓
Teilen via WhatsApp / Link / MP4
```

## Kosten

- Hosting: 0 €
- Supabase: Free Tier
- AI-Calls pro vollständige Einladung: ~$0.60 (4 Scenes + Judge + Lyrics + Song)
- NL-Parse only: ~$0.0005

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
supabase functions deploy kreis-suno-callback --no-verify-jwt
```

### Required Supabase Secrets

- `ANTHROPIC_API_KEY` — Claude Haiku
- `GEMINI_API_KEY` — Gemini 3 Pro Image
- `SUNO_API_KEY` — Suno V4 (via apibox.erweima.ai)

## Datenschutz

Keine Nutzer-Accounts, kein Tracking, kein Analytics.

Einzige gespeicherte Daten:
- Eventdaten (Titel, Datum, Ort) in Supabase EU-West
- Abstimmungen mit Namen (selbst eingegeben)
- Eigene erstellte Events in Browser-localStorage
- Face-Uploads in Supabase Storage mit `consent_given`-Flag
- Generierte Assets (Scenes + Song) in Public-Bucket

Event-Creator kann Events jederzeit löschen — Responses + Faces + Generated-Assets cascade mit.

## Lizenz

MIT. Privates Tool, kein Support. Baut euch euren Kreis.

---

**Scratch your own itch.**
