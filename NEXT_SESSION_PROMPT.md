# Prompt für nächste KREIS-Session

**Kopiere alles unter der Linie in den nächsten Claude-Chat.**

---

# Kontext: KREIS App — Nächste Session (V3 UX-Pivot)

## Wer ich bin
Jürgen Gassner, 44, Hechingen. Baue seit 18.-19.04.2026 die App **KREIS** mit Claude. Verhalte dich wie meine normale Claude-Session:
- Deutsch, duzen, Umlaute, direkt
- Brutal ehrlich wenn nötig
- **WENIGER BREMSEN** (Feedback 18.04.): Wenn ich "los" sage → bauen, keine Meta-Predigten
- IT-Metaphorik, kein Smalltalk
- PDA-safe: keine Pushes/Deadlines/Shame

Lese **CLAUDE.md** in `/Users/juergen.gassner/Desktop/Jürgen : ATLAS 2.0/CLAUDE.md` für vollen User-Kontext (Diagnosen, Prioritäten, Sprach-Regeln).

## Was KREIS ist (heute, 19.04.2026)

Tool für engen Freundeskreis — gemeinsam entscheiden, ob wir zu einem Event gehen. "Scratch your own itch"-Projekt. Nicht Revenue-Business.

**Live:** https://1gassner.github.io/kreis/
**Repo:** https://github.com/1gassner/kreis
**Backend:** Supabase `sgsufdxggvfgejwiclot` (eu-west-1)
**Test-Event:** Prodigy Stuttgart 20.11.2026, ID `bb6b7f8b-c3fe-4596-ada5-b768f9256dd4`

## Tech-Stack

- **Frontend:** Single-file HTML + Tailwind (CDN) + Inter + Material Symbols + vanilla JS (~2000 LOC)
- **Backend:** Supabase Postgres + 4 aktive Edge Functions (Deno)
- **Edge Functions aktiv:**
  - `kreis-parse-event` (Claude Haiku: NL → Event)
  - `kreis-compose-invite` v3 (Claude-Plan + 4× Gemini 3 Pro Image "Nano Banana Pro" parallel + Identity-Judge + Retry)
  - `kreis-compose-song` v6 (Claude-Lyrics + Suno V4 + Callback-URL + Promise.all)
  - `kreis-suno-callback` (Webhook)
- **Edge Functions deprecated (410 Gone):** kreis-env-check, kreis-face-swap, kreis-generate-invite-image
- **DB:** kreis_events, kreis_responses, kreis_faces, kreis_generated
- **Storage:** kreis-faces (privat, signed URLs 2h), kreis-generated (public)
- **AI:** Claude Haiku 4.5, Gemini 3 Pro Image, Suno V4, ffmpeg.wasm (client-side MP4)

## Status Quo (19.04.2026 ~01:30)

### ✅ Gebaut

**V1 MVP** (18.04. Nachmittag):
- NL-Event-Erstellung (Claude parsed "Klettern Sa mit Nino" → strukturiertes Event)
- Voting: Dabei / Vielleicht / Nicht dabei + Note
- Live-Refresh (nur für Gäste, nicht Owner)
- My-Events-Liste (localStorage)
- WhatsApp-Share, ICS-Export, Web Share API, Event bearbeiten/löschen
- Stitch-Design integriert (Tailwind + Material Design 3 Tokens)
- PWA-Manifest + OG-Meta-Tags

**V2 AI-Einladung** (19.04. Nachtsession):
- Multi-Guest-Setup (bis 4 Personen, Face + Name + Größe)
- 4× Gemini Pro Image parallel mit Identity-Lock + Claude-Judge (Score 0-10, Retry bei <6)
- Position-Lock, Height-Info, No-Duplicates-Guard
- Claude-Lyrics personalisiert aus Event-Note + Guest-Namen
- Suno V4 mit Callback (2 Tracks pro Request)
- HTML5 Slideshow-Player mit Ken-Burns, autoplay, Share-Link
- ffmpeg.wasm client-side MP4-Export (720×960, 1-3 Min Render)

**Round 1+2 Code Review + Fixes** (19.04. Morgen):
- Race-Conditions, kind-Standardization, Signed-URL-TTL (2h), Polling (10 Min), Memory-Leak-Cleanup (Film-Modal-Listener), a11y (role=dialog, aria-pressed), parallele DB-Fetches, composite DB-Index

### 🎯 KOSTEN
- ~$0.60 pro vollständige Einladung (Claude + 4 Gemini Pro + Suno)
- Alle Secrets in Supabase: ANTHROPIC_API_KEY, GEMINI_API_KEY, SUNO_API_KEY

---

## 🔴 DIE NEUE VISION (was wir in V3 bauen wollen)

### Das Problem mit dem aktuellen UX

**Aktuell** muss der Creator zu viel eingeben:
- Event-Daten (ok, NL-Input macht das einfach)
- Pro Gast: Foto hochladen + Name + Größe
- Style-Hint für Song (optional)
- Dann 3 Buttons drücken: Compose Invite, Song, Film
- Dann Film anschauen, teilen, etc.

**Das ist zu viel.** Jürgen will einen **radikal vereinfachten Flow** — der User wird **Schritt für Schritt** geführt, und die Komplexität läuft im Hintergrund.

### Die neue UX (Mental Model)

**Hypothese A — "Kollaborative Einladungs-Produktion" für einen Ehrengast:**
```
Creator startet: "Einladung für Ninos 40. Geburtstag"
  ↓
Creator teilt Link mit Co-Einladenden (Jürgen, Thomas, Cindy, Rapha, ...)
  ↓
Jeder Co-Einladende klickt Link, sieht:
  Schritt 1: Abstimmung (Bist du dabei?)
  Schritt 2: Name
  Schritt 3: Foto hochladen
  Schritt 4: [optional] Story-Feld ("Erzähl uns was über Nino / was du mit ihm verbindest")
  ↓
Im Hintergrund automatisch:
  - Alle Stories → Claude schreibt personalisierte Lyrics
  - Alle Fotos → Gemini generiert Scenes mit allen Gesichtern
  - Suno komponiert den Song
  - Einladungs-Film wird gerendert
  ↓
Co-Einladende sieht am Ende NUR: "Hier ist der Einladungs-Film für Nino"
  ↓
Film wird an Nino weitergeleitet (WhatsApp / Link / MP4) als ECHTE Einladung
```

**Hypothese B — "Einfacher RSVP + Film als Teaser":**
```
Creator erstellt Event
Link wird verteilt
Empfänger: Abstimmung + Name + Foto + Story
Im Hintergrund: Film aus allen Mitmachern
Am Ende: Film als geteilter Moment, jeder kann ihn weiterschicken
```

**WICHTIG:** Welche Hypothese richtig ist → zuerst mit Jürgen klären. Er sagte:
> "dieser einladungsfilm wird dann an die person weitergeleitet, für den die einladung gilt"

Das klingt mehr nach **Hypothese A** (Ehrengast-Szenario). Aber in Hypothese A ist "die Person, für die die Einladung gilt" = der Ehrengast (Nino). Das macht Sinn bei Geburtstagen, Surprise-Events, "Willst du heiraten"-Szenarien.

Bei normalen Events (Klettern, Konzert) ist es vielleicht **Hypothese B**.

Beides interessant. **Frage Jürgen zuerst welches Szenario** bevor du baust.

### Konkrete UX-Schritte (wizard-style)

Egal welche Hypothese — der User-Flow soll sein:

```
┌─────────────────────────────────┐
│  Schritt 1: Dabei?              │
│                                 │
│  🟢 Ja, ich bin dabei           │
│  🟡 Vielleicht                  │
│  🔴 Nein, kann nicht            │
│                                 │
│  [Weiter]                       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Schritt 2: Dein Name           │
│                                 │
│  [___________]                  │
│                                 │
│  [Zurück]      [Weiter]         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Schritt 3: Ein Foto von dir    │
│                                 │
│  📷 Foto wählen / machen        │
│                                 │
│  [Zurück]      [Weiter]         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Schritt 4 (optional):          │
│  Erzähl uns was                 │
│                                 │
│  "Mein erstes Konzert mit       │
│   [Name] war..."                │
│                                 │
│  [Textarea]                     │
│                                 │
│  [Überspringen]   [Fertig]      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  ✨ Wir zaubern deinen Film...  │
│                                 │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░  40%        │
│  Claude schreibt Lyrics...      │
│                                 │
│  (1-3 Min, bleib da)            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  🎬 Dein Einladungs-Film        │
│                                 │
│  [AUTOPLAY FULLSCREEN]          │
│                                 │
│  [Teilen]   [Nochmal machen]    │
└─────────────────────────────────┘
```

### Technische Konsequenzen

**Was anders wird:**

1. **Frontend:** Wizard-Komponente mit Steps, State-Machine, Progress-Bar
2. **Aktuelle Owner-Section** (Multi-Guest-Upload + Compose-Buttons) wird zu Fallback/Admin-View, nicht Default
3. **Neue DB-Spalte** `kreis_responses.story_text` für Story-Feld
4. **Trigger-Logik:** Wann wird der Film generiert? Bei jedem neuen Response? Bei n≥3? Nur auf expliziten Trigger? 
5. **Film muss "progressiv"** sein — beim ersten Render mit 1 Person, beim zweiten mit 2, etc. ODER einmalig nach Threshold.
6. **Wer sieht den Film?** Jeder der abgestimmt hat? Nur der Creator? Nur der Ehrengast?
7. **Wie geht der Film an den "Empfänger"?** Email? WhatsApp? Link im Response-Page?

**Was bleibt:**
- DB-Schema (kreis_events, kreis_responses, kreis_faces, kreis_generated) — nur Erweiterung um story_text
- Edge Functions (kreis-compose-invite, kreis-compose-song, kreis-suno-callback) — bleiben
- Supabase-Secrets
- Stitch-Design-Tokens

### Prioritäten für V3

**Zuerst klären:**
1. Hypothese A oder B? (Jürgen fragen)
2. Was ist "der Empfänger"? (Ehrengast / alle RSVP'er / nur Creator?)
3. Wann wird der Film generiert? (einmalig / progressiv / on-demand?)

**Dann bauen:**
1. Wizard-UX: Step-by-Step mit Auto-Advance bei Complete
2. DB-Migration: `kreis_responses` bekommt `story_text TEXT` Spalte
3. Auto-Compose-Trigger: Wenn n Gäste (konfigurierbar, z.B. 3+) + Fotos vorhanden → Film automatisch generieren im Background
4. Film-View-Route: `/?event=X&view=final` zeigt nur den fertigen Film ohne Admin-UI
5. Share-Flow: "Film an Ehrengast / Freundeskreis schicken" mit WhatsApp/Email-Templates

**Später:**
- Notifications wenn Film fertig (opt-in)
- Edit-Mode für Creator (falls Film nochmal regenerieren)
- Multiple Film-Versionen (z.B. 30s-Teaser + 2-Min-Vollversion)

---

## Was DU in der neuen Session zuerst machst

1. **Lese CLAUDE.md komplett** (Kontext über User + Prioritäten)
2. **Lese `08_ZUKUNFT/KREIS/KREIS_Konzept.md`** (aktueller technischer Stand)
3. **Lese `project_kreis_app.md`** im Memory (Kurzfassung)
4. **Frage Jürgen** welche Hypothese (A/B) er meint + die 3 offenen Fragen oben
5. **Plane die Wizard-UX** mit ihm bevor du codest
6. **Dann bauen** — er sagt "los", du baust, keine Meta-Bremsen

## Frühere Commits zum Verstehen

```bash
git log --oneline -20
# d28716c refactor+docs: full code review fixes + kind-standardization
# f3221b7 feat(film): HTML5 Slideshow + MP4-Export
# f30cf4e feat(song): Audio-Player + Cover + Polling
# 83ade8a feat: V2 AI-Einladung — Full Compose Pipeline
# 7ede7e7 feat: V2 Face-Swap MVP
# a2bac6f feat: Stitch-Design + V1.5
# 8665e91 feat: KREIS MVP
```

## Supabase DB / Edge Functions via MCP

Supabase-MCP ist konfiguriert. Du kannst:
- `mcp__supabase__execute_sql` für SELECTs
- `mcp__supabase__apply_migration` für DDL (neue Spalte story_text)
- `mcp__supabase__deploy_edge_function` für Edge Functions
- `mcp__supabase__list_edge_functions` um zu schauen was live ist
- `mcp__supabase__get_logs` für Debug

Project-ID: `sgsufdxggvfgejwiclot`

## Jürgens Kontext (für ADHS-safe UI-Design)

- kPTBS, ADHS, Autismus — **wenige Optionen, klare Schritte, keine Betonwände**
- Einzelschritt statt Formular
- Progress-Feedback sichtbar (nicht "lädt..." ohne Fortschritt)
- Abbrechen jederzeit möglich
- Keine Pflicht-Felder außer Name + Foto

## Was NICHT bauen

- Komplexe Admin-UIs (aktuelle Owner-Section ist schon zu viel)
- User-Accounts / Login
- Push-Notifications (PDA-Trigger)
- Gamification / Streaks
- Public Feed

---

**Los gehts. Erste Frage an Jürgen: Hypothese A oder B? Oder etwas Drittes das ich noch nicht verstanden habe?**
