# KREIS — Konzept

**Arbeitstitel:** KREIS
**Tagline:** *Für enge Menschen — gemeinsam entscheiden, ob wir was machen.*
**Gestartet:** 18.04.2026 (scratch-your-own-itch an Mutters-Geburtstag-Vortag)
**Stand dieser Doku:** 19.04.2026, V2-Release komplett

---

## Frame-Shift (der Kern)

Ursprünglich WECANDO-EXPERIENCE: Million-User-Event-Marketplace. Blocker: Two-Sided-Marketplace, Ticket-APIs, Payment-Splitting, Cold-Start, Facebook-API-Tod. Nicht machbar.

**Umkehr:** Tool für engen Kreis ist nicht Fallback — war immer der eigentliche Plan. "Scratch your own itch" (Basecamp, Slack, Linear, Figma).

Jürgen 18.04.2026: *"Ich hab ja wenigstens das Produkt und kann es selbst mit meinen Freunden nutzen."*

---

## Stand (19.04.2026) — V2 LIVE

- **URL:** https://1gassner.github.io/kreis/
- **Repo:** https://github.com/1gassner/kreis (public, MIT)
- **Backend:** Supabase `sgsufdxggvfgejwiclot` (eu-west-1)
- **Pipeline:** Text → 4 AI-Scenes → Song → Video, alles in einem Flow

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

### Features V2 (19.04.2026) — AI-Einladung

**V2.1: Multi-Guest-Setup**
- Bis zu 4 Personen pro Einladung
- Pro Gast: Foto (5 MB max), Name, Größe (optional, für Proportionen)
- LocalStorage-Persistenz der Gast-Profile pro Event
- Face-Upload zu privatem Supabase-Storage-Bucket (`kreis-faces`), signed URLs (2h TTL)

**V2.2: AI-Scene-Generation (Edge Function `kreis-compose-invite` v3)**
- Claude Haiku analysiert Event → bestimmt Event-Type + schreibt 4 Scene-Prompts + Event-Beschreibung + Song-Hook
- 4× Gemini 3 Pro Image ("Nano Banana Pro") **parallel** (~30s total)
- Identity-Preservation via Multi-Ref (bis 4 Faces/Person)
- Position-Lock (erste Person links, zweite rechts)
- Height-Info für korrekte Proportionen
- No-Duplicates-Guard (`EXACTLY N persons, no clones`)

**V2.3: Identity-Check**
- Nach jedem Gemini-Output: Claude-Judge vergleicht Generated vs Reference
- Score 0-10, bei < 6 → Retry mit verstärktem Prompt
- Bei < 4 → Scene verworfen (nicht angezeigt)
- Frontend zeigt Sternen-Badge pro Scene + avg_identity_score

**V2.4: Song-Composition (Edge Function `kreis-compose-song` v5)**
- Claude Haiku schreibt Lyrics (deutsch, personalisiert mit Gast-Namen + Notes)
- Style-Guesser aus Event-Titel (Prodigy → Big Beat, Klettern → Indie Rock, etc.)
- Suno V4 Call mit `customMode` + `callBackUrl`
- 2 Tracks pro Request (Suno-Default)
- Async-Callback-Handler `kreis-suno-callback` speichert Audio-URLs in DB

**V2.5: Einladungs-Film**
- HTML5-Slideshow-Player: 4 Scenes mit Ken-Burns-CSS + Song synchron
- Fullscreen-Modal, Autoplay, Caption-Overlay, Progress-Bar
- Shareable Link `?view=film` → öffnet direkt Film-Viewer
- **MP4-Export via ffmpeg.wasm** client-side (720×960 H.264, 1-3 Min Render)

### Kosten V2 pro Einladung

| Schritt | Tool | Kosten |
|---------|------|--------|
| NL-Parse | Claude Haiku | ~$0.0005 |
| Scene-Plan | Claude Haiku | ~$0.001 |
| 4× Scene-Gen | Gemini 3 Pro Image | ~$0.48 |
| 4× Identity-Judge | Claude Haiku Vision | ~$0.02 |
| Lyrics | Claude Haiku | ~$0.001 |
| Song | Suno V4 | ~$0.10 |
| Storage + Edge Functions | Supabase | ~$0.00 (Free Tier) |
| **Total pro vollständige Einladung** | | **~$0.60** |

### Datenmodell

```sql
kreis_events(id uuid, title, location, date_start, date_end, link, note, created_by, created_at, archived)
kreis_responses(id uuid, event_id fk, user_name, response enum[yes,maybe,no], note, created_at, updated_at)
kreis_faces(id uuid, event_id fk, user_name, storage_path, consent_given, created_at)
  -- unique(event_id, user_name)
kreis_generated(id uuid, event_id fk, kind enum[scene_image, face_swap, song, video], url, meta jsonb, created_at)
```

**Storage-Buckets:**
- `kreis-faces` — privat, signed URLs (2h TTL)
- `kreis-generated` — public, direkt via `<img>`/`<audio>` ladbar

**RLS:** anon kann lesen + schreiben (Event-ID = Secret, kein Auth-Layer im MVP).

---

## Edge Functions (Stand 19.04.2026)

### Aktiv

| Slug | Version | Zweck |
|------|---------|-------|
| `kreis-parse-event` | v4 | NL → Event-JSON (Claude Haiku) |
| `kreis-compose-invite` | v3 | 4× Gemini Pro + Identity-Judge + Retry |
| `kreis-compose-song` | v5 | Lyrics (Claude) + Song (Suno V4) |
| `kreis-suno-callback` | v1 | Webhook für Suno-Fertigmeldung |

### Deprecated (19.04.2026 disabled, 410 Gone)

| Slug | Grund |
|------|-------|
| `kreis-face-swap` | Replicate-Face-Swap ersetzt durch Gemini Multi-Ref |
| `kreis-generate-invite-image` | Einzel-Bild-Endpoint ersetzt durch `kreis-compose-invite` (4er-Batch) |
| `kreis-env-check` | Debug-Endpoint leakte Secret-Prefixes, security-disabled |

---

## V3 — Zukunft (nicht gebaut, offen)

### Identity-LoRA pro Person (~$5 einmalig)
- Replicate `ostris/flux-dev-lora-trainer`
- 15-20 Fotos pro Person → Custom LoRA mit Trigger-Word
- Inference via `black-forest-labs/flux-dev-lora` mit geladenem LoRA
- Identity-Score erwartet 95%+ (vs aktuell 60-80%)

### MP4-Server-Side-Rendering
- Shotstack.io / Creatomate statt ffmpeg.wasm (schneller, zuverlässiger)
- Template-basiert, Ken-Burns + Transitions + Audio
- ~$0.01 pro Minute Output

### Discovery-Feed (falls skalierbar)
- Nur wenn V2 in realem Freundeskreis getestet und genutzt wird
- Öffentliche Event-Feed-Seite mit lokalen Events (Hechingen, Reutlingen, Tübingen)
- Swipe-basierte Discovery → in eigenen Kreis übernehmen

---

## Nicht-Ziele (explizit)

KREIS wird nie:
- Payment-Splitting (Splitwise existiert)
- Tickets verkaufen (Ticketing-Business)
- Facebook-/Meta-Integration (APIs sind tot)
- Gamification / Streaks / Shame-Mechaniken (PDA-Trigger)
- Push-Reminder ohne Opt-In (Anti-Spam)
- Öffentliches Profil ohne Opt-In (Anti-Stalker)
- Matching / Algorithmus-Empfehlungen für V1-V2

---

## Persönliche Ebene

KREIS ist mehr als ein Tool. Es ist:
- **Aktive Freundschaftspflege** in Zeit, wo Jürgen sich wegen AU + Diagnosen oft zurückzieht
- **Beweis**, dass er bauen kann, wenn's aus Liebe ist statt aus Druck
- **Geschenk** an Nino, Cindy, Thomas, Rapha, Marc
- **Anti-Isolation-Werkzeug** — macht "auf die Freunde zugehen" leichter

Wenn nur Jürgen + 5 Freunde es nutzen = **voller Erfolg.** Kein Business-Projekt.

---

## Referenzen

- **Repo:** https://github.com/1gassner/kreis
- **Live:** https://1gassner.github.io/kreis/
- **Supabase:** sgsufdxggvfgejwiclot.supabase.co
- **Test-Event (Prodigy Stuttgart):** https://1gassner.github.io/kreis/?event=bb6b7f8b-c3fe-4596-ada5-b768f9256dd4
- **Memory:** `project_kreis_app.md`
- **CLAUDE.md:** siehe "Technische Referenzen" → KREIS-Zeile
