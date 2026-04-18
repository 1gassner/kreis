# KREIS — Konzept

**Arbeitstitel:** KREIS
**Tagline:** *Für enge Menschen — gemeinsam entscheiden, ob wir was machen.*
**Gestartet:** 18.04.2026 (parallel zu Mutter-Geburtstag, nach dem "scratch your own itch"-Frame-Shift)

---

## Frame-Shift (der Kern)

Ursprüngliche WECANDO-EXPERIENCE-Idee war "Million-User-Event-Marketplace". Die 5 Blocker (Two-Sided-Marketplace, Ticket-APIs, Payment-Splitting, Cold-Start, Facebook-API-Tod) haben das zum $5M-Startup gemacht — nicht machbar neben AU, kPTBS, ADHS-Diagnostik.

**Umkehr:** Der Freundeskreis-Use-Case war nie Fallback. Er war immer der eigentliche Plan. Der Marketplace war der Fallback — falls es zu groß wird.

**Jürgens Satz** (18.04.2026):
> "Ich hab ja wenigstens das Produkt und kann es selbst mit meinen Freunden nutzen."

Das ist der klügste Satz. "Scratch your own itch" ist das stärkste Product-Pattern (Basecamp, Slack, Linear, Figma, Notion, Loom). Du baust das Ding, das DU brauchst — wenn andere es auch wollen: Bonus.

---

## Das Problem (echt)

Event taucht auf (Konzert, Klettern, Festival, Kino, Party). Jemand schreibt "Hat jemand Bock?" in 3 verschiedene WhatsApp-Chats. 4 Leute antworten nicht. 1 sagt "vielleicht". 1 sagt "ich schau noch". Entscheidung versandet. **Regret.**

Bestehende Tools:
- **Doodle**: Zeit-Abstimmung, kein Event-Context
- **Partiful / Luma**: näher dran, aber nicht deutsch, nicht ADHS-safe, keine AI-Magie
- **WhatsApp-Polls**: Friktion (alle scrollen hoch), kein Persistent-Archiv
- **Meetup**: öffentlich, nicht für enge Kreise

---

## V1 — MVP (fertig 18.04.2026)

### Status: LIVE
- URL: https://1gassner.github.io/kreis/
- Repo: https://github.com/1gassner/kreis
- Backend: Supabase `sgsufdxggvfgejwiclot` (eu-west-1)
- Edge Function: `kreis-parse-event` (Claude Haiku 4.5)

### Features
1. **Natural Language Input** (Killer-Feature)
   - "Klettern Reutlingen nächsten Samstag 15 Uhr mit Nino und Cindy"
   - Claude Haiku parsed → strukturierte Event-Daten
   - User confirmed/editiert Preview
   - Cmd+Enter Shortcut

2. **Voting**
   - 🟢 Dabei · 🟡 Vielleicht · 🔴 Nicht dabei
   - Optional Frei-Text-Note
   - Live-Refresh alle 8s
   - Keine Deadlines, keine Pushes, keine Shame-Mechanik (PDA-safe)

3. **Share**
   - Clipboard-Copy-Button
   - Link → WhatsApp-Share
   - Kein App-Install nötig (PWA)

4. **Minimaler Footprint**
   - Single-file HTML (~700 Zeilen, kein Build)
   - Mobile-first, dark, ADHS-freundlich
   - Kein User-Auth (Event-ID = Secret)

### Tech-Stack
- **Frontend:** Plain HTML/CSS/JS, Supabase-JS v2.39 via CDN
- **Backend:** Supabase Postgres (Tabellen: `kreis_events`, `kreis_responses`)
- **AI:** Claude Haiku 4.5 via Edge Function (`kreis-parse-event`)
- **Hosting:** GitHub Pages (kostenlos, automatische SSL)

### Kosten V1
- Hosting: 0 €
- Supabase: im Free Tier
- Claude API: ~$0.0005 pro NL-Parse (1000 Events = 50 Cent)

### Datenmodell
```sql
kreis_events(id uuid, title, location, date_start, date_end, link, note, created_by, created_at, archived)
kreis_responses(id uuid, event_id fk, user_name, response enum[yes,maybe,no], note, created_at, updated_at)
```
RLS: anon kann lesen + schreiben. Event-ID ist der "Secret" (nicht geratbar).

---

## V2 — Der emotionale Kern (nach 24.04. / nach calm)

**Jürgens Worte (18.04.):**
> "Die Einladung muss anhand der Fotos (Face von mir und Face von Freunden), inklusive Face-Swap und AI-Bildern (wir auf dem Event AI-simuliert als Einladungsslideshow mit Einladungs-Song bei Suno). Das ist eine wichtige Sache für mich."

**Vision:**

```
Event erstellt ("Klettern Reutlingen Sa, mit Nino + Cindy")
  ↓
Suno generiert 30-60s Einladungs-Song
  ↓
Gemini/FLUX generiert 4-6 Event-Szenen
  ↓
Replicate/Piapi Face-Swap: echte Gesichter auf Szenen
  ↓
ffmpeg/Luma: Slideshow mit Song → 30-60s Video
  ↓
Video-URL + Event-Link in WhatsApp
  ↓
Freunde sehen sich selbst schon → "Fuck ja, dabei"
```

### Phasen

| Phase | Was | Dauer |
|-------|-----|-------|
| 2a | Foto-Profile (jeder Freund registriert Gesicht, Supabase Storage, Consent-Checkbox) | 1 Nachmittag |
| 2b | Face-Swap-Pipeline (Replicate API oder Piapi.ai) | 1-2 Tage |
| 2c | AI-Szenen-Generierung (Gemini/FLUX mit Event-Context-Prompts) | 1 Tag |
| 2d | Suno-Song-Integration (AVA hat `generate_music` Tool) | halber Tag |
| 2e | Video-Slideshow-Rendering (ffmpeg oder Luma) | 1-2 Tage |
| 2f | Share-Flow (Video-URL + Preview in WhatsApp) | halber Tag |

**Total: ~1-2 Wochen Arbeit.** Nicht Nachmittag.

### Kosten V2 pro Einladung
- Suno: ~$0.10 (1 Song)
- Gemini/FLUX: ~$0.04-0.10 (4-6 Bilder)
- Replicate Face-Swap: ~$0.01 (pro Bild × Gesichter)
- Luma/ffmpeg Video: ~$0.10-0.30
- **Total: ~$0.30-0.60 pro Einladung.** 20 Einladungen/Monat = ~$10.

### Datenschutz (kritisch)
Freunde geben Jürgen ihr Gesicht → das ist hochsensibel. Braucht:
- Explizite Opt-In pro Person
- Löschung jederzeit (Supabase DELETE + Storage purge)
- Kein Upload ohne Consent-Checkbox im UI
- EU-Storage (Supabase eu-west-1 ✓)
- Keine Weitergabe an Dritte (außer Face-Swap-Dienstleister mit DPA)
- Transparenz: User sieht Liste seiner registrierten Bilder

---

## V3 — Discovery (später, optional)

Erst wenn V2 läuft und Bock nachkommt. Öffentliche Event-Feed-Seite mit lokalen Events (Hechingen, Reutlingen, Tübingen, Zollernalb). TikTok-artiger Swipe. Jürgen wählt Events, die er seinen Freunden vorschlagen will → auto-ins-KREIS.

Das ist dann **die** Expansion Richtung ursprüngliches WECANDO EXPERIENCE. Aber: Nur wenn V2 heilsam war, nicht stressig.

---

## Nicht-Ziele (wichtig!)

KREIS wird **nie**:
- Payment-Splitting (Splitwise existiert)
- Tickets verkaufen (das ist Ticketing-Business)
- Facebook-/Meta-Integration (die APIs sind tot)
- Gamification / Streaks / Shame-Mechaniken (PDA-Trigger)
- Push-Reminder an Freunde ohne Opt-In (Anti-Spam)
- Öffentliches Profil (Anti-Stalker)
- Matching / Algorithmus / Empfehlungen für V1-V2

---

## Persönliche Ebene

KREIS ist mehr als ein Tool. Es ist:
- **Aktive Freundschaftspflege** in Zeit, wo Jürgen sich wegen AU + Diagnosen oft zurückzieht
- **Beweis**, dass er bauen kann, wenn's aus Liebe ist statt aus Druck
- **Geschenk** an Nino, Cindy, Thomas, Rapha, Marc — Menschen, die ihm wichtig sind
- **Anti-Isolation-Werkzeug** — macht das "auf die Freunde zugehen" leichter, weniger Overhead

**Nicht:** ein weiteres Business-Projekt, das Revenue bringen muss. Wenn nur Jürgen + 5 Freunde es nutzen = **voller Erfolg.**

---

## Referenzen

- **Repo:** https://github.com/1gassner/kreis
- **Live:** https://1gassner.github.io/kreis/
- **Supabase:** sgsufdxggvfgejwiclot.supabase.co
- **Edge Function:** kreis-parse-event
- **Lokale Dev:** `http://localhost:8094/` (launch.json: `kreis`)
- **CLAUDE.md Eintrag:** `project_kreis_app.md` (Memory-System)
