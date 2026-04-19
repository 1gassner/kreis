# KREIS — Konzept

**Arbeitstitel:** KREIS
**Tagline:** *Für enge Menschen — gemeinsam entscheiden, ob wir was machen.*
**Gestartet:** 18.04.2026 (scratch-your-own-itch an Mutters-Geburtstag-Vortag)
**Stand dieser Doku:** 19.04.2026 abends, V3-Release LIVE aber UX umstritten

---

## Frame-Shift (der Kern)

Ursprünglich WECANDO-EXPERIENCE: Million-User-Event-Marketplace. Blocker: Two-Sided-Marketplace, Ticket-APIs, Payment-Splitting, Cold-Start, Facebook-API-Tod. Nicht machbar.

**Umkehr:** Tool für engen Kreis ist nicht Fallback — war immer der eigentliche Plan. "Scratch your own itch" (Basecamp, Slack, Linear, Figma).

Jürgen 18.04.2026: *"Ich hab ja wenigstens das Produkt und kann es selbst mit meinen Freunden nutzen."*

---

## 🚧 Offene Design-Entscheidung (Stand 19.04.2026 abends)

**Jürgens Feedback zur V3-UI:** *"immer noch viel zu kompliziert :("*

Die App will aktuell **zwei Dinge gleichzeitig sein**:

1. **RSVP-Tool** — "Wollen wir was machen?" mit Abstimmung (V1-Kern)
2. **AI-Film-Studio** — Wizard, Foto-Upload, Story, Suno, Gemini, Token-Links, Ehrengast-Modus (V3-Feature)

Diese beiden Flows teilen sich eine UI → Überladung. Fünf unterschiedliche Screens (Create, Event-Detail Guest, Event-Detail Owner, Wizard, Honoree-Landing), zwei parallele URL-Schemes (`?event=X` vs `?token=X`), Auto-Wizard-Hijacking beim Öffnen von Gast-Links.

**Morgen zu entscheiden — 2 Optionen:**

### Option A: Hard Split — RSVP-App + Studio-Mode
- `?event=X` → NUR Hero + Vote + Attendees + Share. **Kein Auto-Wizard.** RSVP in 10 Sekunden.
- `?event=X&studio=1` → Wizard + Upload + Render + Token-Share. Eigene Welt. Bewusst.
- `?token=X` → Ehrengast-Film-Viewer bleibt separate Route.
- Creator sieht im Event-Detail einen dezenten Link *"🎬 Daraus einen Einladungsfilm machen →"*.

### Option B: Film komplett raus
- KREIS ist nur RSVP-Tool. Punkt.
- Wizard/Film/Ehrengast/Token-Logik weg oder in eigenes Repo.
- Kehrt zurück zum V1-Simplicity-Versprechen.

**Entscheidungs-Kriterium:** Willst du den Film-Teil für Ninos Prodigy-Abend nutzen oder war das nur eine Spielerei?

---

## Stand (19.04.2026) — V3 LIVE

- **URL:** https://1gassner.github.io/kreis/
- **Repo:** https://github.com/1gassner/kreis (public, MIT)
- **Backend:** Supabase `sgsufdxggvfgejwiclot` (eu-west-1)
- **Aktueller Commit:** `2b7cf4f` (Bug-Fix-Pass)

### Features V1 (MVP, 18.04.2026 Nachmittag)

1. **Natural Language Input** — Claude Haiku parsed freien Text zu Event (Titel, Ort, Datum, Freunde)
2. **Voting** — 🟢 Dabei / 🟡 Vielleicht / 🔴 Nicht dabei + Note
3. **Live-Refresh** 8s-Poll für Nicht-Creator
4. **My Events** in localStorage (letzte 50)
5. **WhatsApp-1-Klick-Share** mit `wa.me/?text=`
6. **Event bearbeiten + löschen** (RLS-geschützt)
7. **ICS-Kalender-Export** iOS-kompatibel
8. **Web Share API** mit Clipboard-Fallback
9. **PWA-Manifest** installierbar auf Homescreen

### Features V2 (19.04.2026 Nachtsession) — AI-Einladung

**V2.1: Multi-Guest-Setup**
- Bis zu 4 Personen pro Einladung, Face-Upload + Name + Größe
- LocalStorage-Persistenz, Face-Upload zu privatem Bucket

**V2.2: AI-Scene-Generation (`kreis-compose-invite` v3)**
- Claude plant 4 Scene-Prompts + Event-Desc + Song-Hook
- 4× Gemini 3 Pro Image parallel (~30s total)
- Identity-Preservation via Multi-Ref

**V2.3: Identity-Check** — Claude-Judge Score 0-10, Retry bei <6

**V2.4: Song-Composition (`kreis-compose-song` v5)**
- Claude Lyrics + Suno V4 mit Callback

**V2.5: Einladungs-Film** — HTML5-Slideshow + ffmpeg.wasm MP4-Export

### Features V3 (19.04.2026 nachmittag+abend) — Wizard + Ehrengast-Produktion

**V3.1: Wizard-Flow für Gäste (6 Steps)**
- RSVP → Name → Foto → Story (optional) → Rendering → Done
- SessionStorage-State-Machine, auto-advance
- Ehrlicher Rendering-Screen: "Du bist #X, wir brauchen noch N" wenn Threshold nicht erreicht, Tech-Log nur bei echtem Render

**V3.2: Ehrengast-Modus (`guest_of_honor` Spalte)**
- Creator setzt optional "Für wen ist die Einladung?"
- Freunde produzieren Film FÜR den Abwesenden
- Scenes zeigen nur anwesende Gäste mit symbolischem Platz
- Lyrics adressieren Ehrengast in Du-Form

**V3.3: Auto-Render-Orchestrator (`kreis-auto-render` v2)**
- Atomic lock via `auto_render_triggered_at`
- Gate-Checks: threshold (3 Gäste), render_count < 3, mindestens 1 Face
- Fire-and-forget compose-invite + compose-song (mit blocking-Fallback wenn EdgeRuntime.waitUntil nicht verfügbar)
- Max 3 Renders pro Event (Kostendeckel $1.80)

**V3.4: Honoree-Landing (`kreis-honoree-view` v1)**
- `?token=<share_token>` Route
- Token-Lookup liefert Event + Scenes + Song in einem Call
- First-Access setzt `film_shared_at` (Creator sieht wann Nino geöffnet hat)
- Asymmetric Layout mit border-left, left-aligned Buttons, Film-Autoplay

**V3.5: Design-System "Celestial Void" (Stitch V1+V2 1:1)**
- Inter Tight (Heart) + JetBrains Mono (Machine)
- Glass-Panels mit 0.5px Borders + 80px backdrop-blur
- Light-Leaks als ambient Background (violet radial-gradients)
- `animate-soft-pulse` für primary CTA, `.glow-selected` für Vote-States

### Kosten V3 pro vollständiger Einladung

| Schritt | Tool | Kosten |
|---------|------|--------|
| NL-Parse | Claude Haiku | ~$0.0005 |
| Scene-Plan | Claude Haiku | ~$0.001 |
| 4× Scene-Gen | Gemini 3 Pro Image | ~$0.48 |
| 4× Identity-Judge | Claude Haiku Vision | ~$0.02 |
| Lyrics | Claude Haiku | ~$0.001 |
| Song | Suno V4 | ~$0.10 |
| Storage + Edge Functions | Supabase | ~$0.00 (Free Tier) |
| **Total pro Render** | | **~$0.60** |
| **Max pro Event (3 Renders)** | | **~$1.80** |

### Datenmodell V3

```sql
kreis_events(
  id uuid, title, location, date_start, date_end, link, note,
  created_by, created_at, archived,
  -- V3:
  guest_of_honor text,                    -- NULL = Gruppen-Modus, gesetzt = Überraschungs-Modus
  share_token uuid UNIQUE,                -- für Ehrengast-Landing ?token=X
  film_shared_at timestamptz,             -- first honoree-view access
  render_count int default 0 NOT NULL,    -- 0..3
  last_rendered_at timestamptz,
  auto_render_threshold int default 3,    -- wieviele wizard_completed für auto-trigger
  auto_render_triggered_at timestamptz    -- atomic lock
)

kreis_responses(
  id uuid, event_id fk, user_name, response enum[yes,maybe,no], note,
  created_at, updated_at,
  -- V3:
  story_text text,                        -- Wizard Step 4 optional
  wizard_completed boolean default FALSE,
  wizard_step smallint default 0
)

kreis_faces(id uuid, event_id fk, user_name, storage_path, consent_given, created_at)
  -- unique(event_id, user_name)

kreis_generated(id uuid, event_id fk, kind enum[scene_image, face_swap, song, song_lyrics, video], url, meta jsonb, created_at)
```

**Indexes:**
- `idx_kreis_events_share_token` (UNIQUE)
- `idx_kreis_responses_wizard` (partial, WHERE wizard_completed = TRUE)
- `idx_kreis_responses_event_user` (UNIQUE ON event_id + lower(user_name))

**Storage-Buckets:**
- `kreis-faces` — privat, signed URLs (2h TTL)
- `kreis-generated` — public

**RLS:** anon kann lesen + schreiben (Event-ID + Token = Secrets, kein Auth-Layer im MVP).

---

## Edge Functions (Stand 19.04.2026)

### Aktiv (V3)

| Slug | Version | Zweck |
|------|---------|-------|
| `kreis-parse-event` | v4 | NL → Event-JSON (Claude Haiku) |
| `kreis-compose-invite` | **v5** | + `stories[]` + `guest_of_honor` mode (absent-honoree scenes) |
| `kreis-compose-song` | **v8** | Auto-read story_text, honoree-addressing lyrics |
| `kreis-auto-render` | **v2** | **NEU** — Orchestrator, atomic lock, 3-render cap |
| `kreis-honoree-view` | **v1** | **NEU** — Token-basierter Ehrengast-Payload |
| `kreis-suno-callback` | v2 | Webhook für Suno-Fertigmeldung |

### Deprecated (410 Gone seit 19.04.2026)

| Slug | Grund |
|------|-------|
| `kreis-face-swap` | Replicate-Face-Swap ersetzt durch Gemini Multi-Ref |
| `kreis-generate-invite-image` | Einzel-Bild-Endpoint durch compose-invite ersetzt |
| `kreis-env-check` | Debug-Endpoint leakte Secret-Prefixes |

---

## V3-Backend-Flow

```
1. Gast öffnet ?event=ABC (noch keine wizard_completed response)
        ↓
   Auto-Wizard startet (Step 1-6)
        ↓
   Submit → kreis_responses mit wizard_completed=true
        ↓
2. Frontend ruft kreis-auto-render {event_id}
        ↓
   Gate-Checks:
     - completed_count >= threshold (3)?
     - render_count < 3?
     - at least 1 face uploaded?
     - auto_render_triggered_at IS NULL (oder force=true)?
        ↓
3a. Wenn alle Gates pass: atomic lock, fire compose-invite + compose-song parallel
    → Wizard zeigt Tech-Log + polled kreis_generated
3b. Wenn not_enough_guests: Wizard zeigt Warte-Screen (kein Fake-Ladebalken)
3c. Wenn render_limit_reached / no_faces / network: Error-Screen
        ↓
4. Scenes + Song fertig → Creator sieht "FILM IST BEREIT" im Dashboard
        ↓
5. Creator klickt "EINLADUNG SENDEN" → Panel mit 2 Optionen:
   - "Der Film an [Ehrengast]" (Token-Link) — WhatsApp + Copy
   - "Gast-Link an Freundeskreis" (Wizard-Link) — WhatsApp + Copy
        ↓
6. Ehrengast klickt Token-Link → ?token=XYZ → renderHonoree
   → honoree-view liefert full Payload, setzt film_shared_at
   → Film autoplay mit Scenes + Song + RSVP-Buttons
```

---

## Kritikpunkte an aktuellem V3-UX (Stand abends 19.04.2026)

1. **5 unterschiedliche Screens** in einer App (Create, Wizard, Event-Guest, Event-Owner, Honoree) — zu viel Zustand.
2. **Zwei URL-Schemes** (`?event=` vs `?token=`) — nicht selbsterklärend.
3. **Auto-Wizard-Hijacking** bei `?event=X` — Gast klickt Link, erwartet Event-Details, kriegt 6-Step-Wizard aufgezwungen.
4. **Doppelter Vote** — Wizard Step 1 RSVP + Event-Detail "Bist du dabei?" Section.
5. **Film-Pipeline dominiert** die Owner-UI obwohl 95% der Nutzung RSVP bleibt.
6. **Ehrengast-Modus** ist ein Power-Feature das für jedes einfache "Gehen wir klettern?" aktiviert werden muss.
7. **Stitch-Designs waren schön** aber nicht für einen hybriden RSVP+Studio-Flow gedacht — die Celestial-Void-Screens sind alle einzelne Single-Purpose-Screens.

---

## Nicht-Ziele (explizit)

KREIS wird nie:
- Payment-Splitting (Splitwise existiert)
- Tickets verkaufen (Ticketing-Business)
- Facebook-/Meta-Integration (APIs sind tot)
- Gamification / Streaks / Shame-Mechaniken (PDA-Trigger)
- Push-Reminder ohne Opt-In (Anti-Spam)
- Öffentliches Profil ohne Opt-In (Anti-Stalker)
- Matching / Algorithmus-Empfehlungen für V1-V2-V3

---

## Persönliche Ebene

KREIS ist mehr als ein Tool. Es ist:
- **Aktive Freundschaftspflege** in Zeit, wo Jürgen sich wegen AU + Diagnosen oft zurückzieht
- **Beweis**, dass er bauen kann, wenn's aus Liebe ist statt aus Druck
- **Geschenk** an Nino, Cindy, Thomas, Rapha, Marc
- **Anti-Isolation-Werkzeug** — macht "auf die Freunde zugehen" leichter

Wenn nur Jürgen + 5 Freunde es nutzen = **voller Erfolg.** Kein Business-Projekt.

Aber: **ein überfrachtetes Tool nutzt auch kein Freund.** Entscheidung morgen (Option A vs B).

---

## Referenzen

- **Repo:** https://github.com/1gassner/kreis
- **Live:** https://1gassner.github.io/kreis/
- **Supabase:** sgsufdxggvfgejwiclot.supabase.co
- **Test-Event (Prodigy Stuttgart, Gruppen-Modus):** https://1gassner.github.io/kreis/?event=bb6b7f8b-c3fe-4596-ada5-b768f9256dd4
- **Test-Token (Honoree-View):** `?token=e7c0da6a-6e2f-4d00-b5b5-66f7d4d17c58`
- **Memory:** `project_kreis_app.md`
- **CLAUDE.md:** siehe "Technische Referenzen" → KREIS-Zeile
- **Next Session Prompt:** `NEXT_SESSION_PROMPT.md`

---

## Commit-Historie (letzte 10)

```
2b7cf4f  fix(ui): 5 bug fixes — stale event, closed foldouts, blob-preview, poll-leak, stale-refresh
acb491f  docs: full update end of day 19.04.2026 — V3 state + open UX decision for tomorrow
add94fb  refactor(ux): 3 userflow-fixes — owner-first, one-primary-share, honest wizard-wait
9f9fa1b  refactor(ui): Clarity pass — Hero-Overlay, 1 label/screen, progressive disclosure, sticky share
2db3ea1  refactor(ui): Full redesign — Stitch V1 "Intima" + V2 "Celestial Void" 1:1
eb9d269  feat(V3): Wizard-Flow + Ehrengast-Produktion + Auto-Render Orchestrator
a4be294  fix(round-3): RLS completeness + callback fallback + empty-lyrics guard
38a91a1  perf+a11y+docs: round-2 review fixes + V3 session prompt
d28716c  refactor+docs: full code review fixes + kind-standardization + legacy cleanup + docs
f3221b7  feat(film): HTML5 Slideshow + Ken-Burns + Share-Link + MP4-Export via ffmpeg.wasm
```

## Bug-Fix-Pass (19.04.2026 spät abends, Commit 2b7cf4f)

Vor dem Schlafen noch 5 kritische Bugs via Code-Review gefixed:

1. **Stale event in Render-Trigger** — `setTimeout(() => loadAndRenderEventView(event), 3000)` nutzte gecachtes event-Object, UI zeigte render_count=0 nach Trigger. Fix: refetch vor reload.
2. **Create-Foldouts closed bei parsed values** — User sah nicht dass Claude location/link/note erkannt hat. Fix: `<details open>` wenn Werte da + Inline-Badge welche Felder.
3. **Wizard Photo `blob://` Preview** — Session-Reload → broken image (blob ungültig). Fix: signed URL (1h TTL) aus Supabase Storage.
4. **pollWizardProgress Memory-Leak** — jedes Wizard-Re-Render spawnte neuen setInterval ohne alten zu clearen → N parallele Polls nach N Renders. Fix: `_wizardPollInterval` + `_wizardPollSafetyTimeout` global, `stopWizardPoll()` clear beides.
5. **scheduleRefresh stale event** — 8s-Gast-Auto-Refresh rief `loadAndRenderEventView(event)` mit altem event-Object → Owner-Edits (Title/Datum/Ort) wurden nicht propagiert. Fix: refetch event in interval.

**Nicht via Preview-Tool getestet** (macOS-Sandbox blockt `python3 -m http.server --directory`). `.claude/launch.json` existiert für zukünftige Sessions aber läuft aktuell nicht.
