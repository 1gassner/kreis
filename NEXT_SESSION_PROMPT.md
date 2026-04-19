# Prompt für nächste KREIS-Session (20.04.2026+)

**Kopiere alles unter der Linie in den nächsten Claude-Chat.**

---

# Kontext: KREIS — Morgen weiter (Stand 19.04.2026 spät abends)

## Wer ich bin
Jürgen Gassner, 44, Hechingen. Baue seit 18.04.2026 die App **KREIS** mit Claude. Verhalte dich wie meine normale Claude-Session:
- Deutsch, duzen, Umlaute, direkt, brutal ehrlich wenn nötig
- **WENIGER BREMSEN** (Feedback 18.04.): Wenn ich "los" sage → bauen, keine Meta-Predigten
- IT-Metaphorik, kein Smalltalk, PDA-safe (keine Pushes/Deadlines/Shame)

Lese **CLAUDE.md** in `/Users/juergen.gassner/Desktop/Jürgen : ATLAS 2.0/CLAUDE.md` für vollen User-Kontext.

## Was KREIS ist & Status

Tool für engen Freundeskreis — gemeinsam entscheiden, ob wir zu einem Event gehen. "Scratch your own itch".

- **Live:** https://1gassner.github.io/kreis/
- **Repo:** https://github.com/1gassner/kreis
- **Backend:** Supabase `sgsufdxggvfgejwiclot` (eu-west-1)
- **Aktueller Commit:** `add94fb`
- **Test-Event (Prodigy Stuttgart):** https://1gassner.github.io/kreis/?event=bb6b7f8b-c3fe-4596-ada5-b768f9256dd4

## 🔴 HAUPTFRAGE MORGEN

**Jürgens Feedback am 19.04.2026 abends:** *"immer noch viel zu kompliziert :("*

Die App will aktuell **zwei Dinge gleichzeitig sein**:
1. **RSVP-Tool** — "Wollen wir was machen?" (V1-Kern, simpel)
2. **AI-Film-Studio** — Wizard, Foto, Story, Gemini, Suno, Token-Links (V2/V3, komplex)

Diese beiden Flows teilen sich eine UI → Überladung. Gäste kriegen beim Öffnen von `?event=X` automatisch den 6-Step-Wizard aufgezwungen obwohl sie nur abstimmen wollen.

### Drei Optionen für morgen

**Option A — Hard Split (Claude-Vorschlag gestern):**
- `?event=X` → **NUR** Hero + Vote + Attendees + Share. Kein Auto-Wizard. RSVP in 10 Sekunden.
- `?event=X&studio=1` → Wizard + Upload + Render + Token-Share. Eigene Welt, bewusst gewählt.
- `?token=X` → Ehrengast-Film-Viewer bleibt separate Route.
- Creator sieht im Event-Detail einen dezenten Link *"🎬 Daraus einen Einladungsfilm machen →"*.

**Option B — Film komplett raus:**
- KREIS ist nur RSVP-Tool. Punkt.
- V3-Features (Wizard, Film, Ehrengast, Token) auf einen feature-freeze-branch, aus der main app.
- Kehrt zurück zum V1-Simplicity-Versprechen.

**Option C — Etwas drittes** das Jürgen noch nicht benennt. Möglicherweise ist die Frustration nicht Komplexität sondern ein spezifisches UI-Detail das er in der Live-Version sieht aber nicht benennen konnte.

**Erste Aufgabe morgen: Jürgen fragen was genau ihn stört, dann gemeinsam zwischen A/B/C entscheiden. KEINE weiteren Fixes ohne Richtungsentscheidung.**

## Was heute (19.04.2026) gebaut wurde

### Backend V3 (alle live, smoke-tested)

| Function | Version | Was neu |
|----------|---------|---------|
| `kreis-compose-invite` | v5 | `stories[]` + `guest_of_honor` mode (absent-honoree scenes mit symbolischem Platz) |
| `kreis-compose-song` | v8 | Auto-read story_text aus DB, honoree-addressing lyrics mit Du-Form |
| `kreis-auto-render` | v2 | **NEU** — Orchestrator mit atomic lock, 3-render cap, threshold-gate, EdgeRuntime-safe |
| `kreis-honoree-view` | v1 | **NEU** — Token-basierter Full-Payload, setzt film_shared_at bei first access |

### DB-Migration V3 (applied)

`kreis_events` +7 Spalten: `guest_of_honor`, `share_token` (UUID UNIQUE), `film_shared_at`, `render_count`, `last_rendered_at`, `auto_render_threshold`, `auto_render_triggered_at`

`kreis_responses` +3 Spalten: `story_text`, `wizard_completed`, `wizard_step`

3 Indexes (share_token unique, wizard_completed partial, event+lower(user_name))

### Frontend V3 (live, aber UX umstritten)

**Commits heute (in Reihenfolge):**

1. `eb9d269` — **feat(V3)** — Wizard-Flow (6 Steps), Ehrengast-Produktion, Auto-Render Orchestrator
2. `2db3ea1` — **refactor(ui)** — Full Redesign Stitch V1 "Intima" + V2 "Celestial Void" 1:1
3. `9f9fa1b` — **refactor(ui)** — Clarity Pass: Hero-Overlay, 1 Label/Screen, Progressive Disclosure, Sticky Share
4. `add94fb` — **refactor(ux)** — 3 Userflow-Fixes: Owner-first, One-Primary-Share, Honest Wizard-Wait

**Was im Code ist:**
- Celestial-Void Design-System (Inter Tight + JetBrains Mono, Glass-Panels, Light-Leaks)
- Wizard (6 Steps: RSVP → Name → Foto → Story → Rendering → Done) mit SessionStorage-State
- Wizard Step 5 ehrlich: `not_enough_guests` zeigt Warte-Screen, `triggered` zeigt Tech-Log
- Create-Flow mit Progressive Disclosure (Titel+Datum groß, Details+Ehrengast in Foldouts)
- Owner-View: Dashboard first (Bento + EINLADUNG-SENDEN-Button), Teilnehmer in `<details>`-Accordion
- Honoree-Landing (`?token=X`) mit asymmetric Layout, Film-Autoplay, RSVP-Buttons
- Sticky Share-Pill unten auf Event-Detail
- Edit/Delete dezent (opacity-50 hover:opacity-100)

**Was im Code NICHT mehr ist:**
- Expert-Mode-Accordion (V2 Composer/Song/Film raw) komplett entfernt
- Separate Share-Section im Main-Scroll
- Multiple mono-labels pro Screen
- 4er Meta-Grid (Info ist jetzt Hero-Overlay)

## Tech-Stack

- **Frontend:** Single-file HTML + Tailwind (CDN) + Inter Tight + JetBrains Mono + vanilla JS (~2400 LOC)
- **Backend:** Supabase Postgres + 6 Edge Functions (Deno)
- **DB:** kreis_events, kreis_responses, kreis_faces, kreis_generated
- **Storage:** kreis-faces (privat, 2h signed URLs), kreis-generated (public)
- **AI:** Claude Haiku 4.5, Gemini 3 Pro Image, Suno V4, ffmpeg.wasm

## Userflow aktuell (verwirrend, darum die Hauptfrage)

```
1. CREATOR öffnet https://kreis/
   → Create-Flow (NL-Input + Progressive Disclosure)
   → Event erstellen
   → redirect zu ?event=X

2. CREATOR auf ?event=X
   → Owner-View: Dashboard (Bento) + EINLADUNG-SENDEN-Button
   → Details in <details>-Accordion (Teilnehmer & Gast-View)

3. GAST kriegt ?event=X-Link
   → Auto-Detection: noch kein wizard_completed → Wizard startet AUTOMATISCH
   → 6 Steps: RSVP → Name → Foto → Story → Rendering → Done
   → nach 3 completed Wizards fires auto-render (Claude + Gemini + Suno)

4. EHRENGAST kriegt ?token=X-Link vom Creator (nur wenn Film fertig)
   → Honoree-Landing: Film-Autoplay + Contributors-Pills + RSVP
```

## Kosten-Modell

- Pro kompletter Render: **~$0.60** (Claude + 4× Gemini Pro + Suno)
- Max 3 Renders pro Event (hard cap in auto-render): **~$1.80**
- Rest: Free Tier (Hosting GitHub Pages, Supabase Free)

## Arbeitsweise morgen

1. **ERST:** Jürgen fragen was genau ihn stört. Konkrete Beispiele, nicht Theorie.
2. **DANN:** A/B/C-Entscheidung treffen.
3. **DANN:** Umsetzen. Kurz, fokussiert, keine Scope-Expansion.

Bei Option A (Split): vermutlich ~100 Zeilen Frontend-Umbau (Router + removal of auto-wizard + new `&studio=1` branch).

Bei Option B (Film raus): großflächiger Revert des V3-Frontend-Codes, Backend bleibt aber nicht aufgerufen.

Bei Option C: je nach Diagnose.

## Bekannte Offene Enden

- **E2E-Test mit echtem Foto-Upload** noch nie durchgespielt (Gate-Test gestern ging bis auto-render, aber ohne Face → `no_faces_uploaded`).
- **Render-Limit-Test** (was passiert bei Render #4?) unverifiziert.
- **Honoree-View** wurde smoke-getestet mit Prodigy-Token, Film autoplay nicht im Browser verifiziert.

## Wichtige Supabase-Project-ID

`sgsufdxggvfgejwiclot` — nutze via mcp__supabase__* Tools.

## Memory-File

`project_kreis_app.md` im ATLAS-Memory — wird separat gepflegt, enthält User-State.

---

**Morgen erster Schritt: Jürgen zum Frühstück fragen. Dann entscheiden. Dann bauen.**
