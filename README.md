# KREIS

> Tool für enge Menschen — gemeinsam entscheiden, ob wir was machen.

**Live:** [1gassner.github.io/kreis](https://1gassner.github.io/kreis/)

## Was ist KREIS?

Ein kleines, intimes Tool für deinen engen Freundeskreis (5-7 Leute), um zu entscheiden, ob ihr zu einem Event geht. Keine Algorithmen. Keine Empfehlungen. Kein öffentlicher Feed. Nur: *"Hey, wanna go?"* + Voting + Live-Status.

- **Natural Language Input** — Tipp "Klettern Reutlingen nächsten Samstag mit Nino und Cindy", Claude Haiku parsed es.
- **Kein Account** nötig. Event-ID ist der Secret — teile den Link, wer ihn hat, kann mitentscheiden.
- **PDA-safe** — keine Pushes, keine Deadlines, keine Shame-Mechanik, keine Streaks.
- **Mobile-first PWA** — installierbar auf iPhone-Homescreen.
- **Dark mode only**, weil warme Abende.

## Features

### V1 (live)
- Natural-Language-Event-Parsing (Claude Haiku 4.5)
- Voting: Dabei / Vielleicht / Nicht dabei, mit optionaler Anmerkung
- Live-Refresh alle 8 Sekunden
- Deine-Events-Liste (lokal gespeichert)
- WhatsApp 1-Klick-Share mit vorgeneriertem Text
- Event bearbeiten + löschen
- Kalender-Export (.ics)
- Native Web Share API
- OG-Preview für Link-Sharing

### V2 (geplant, nach 24.04.)
Siehe [`KREIS_Konzept.md`](KREIS_Konzept.md):
- Einladungs-Videos mit Face-Swap (echte Gesichter auf AI-Szenen)
- Suno-generierter Einladungssong pro Event
- Slideshow + Voice-Input

## Stack

- **Frontend:** Single-file HTML + Tailwind (CDN) + vanilla JS. Kein Build.
- **Backend:** Supabase Postgres (anon-RLS)
- **AI:** Claude Haiku 4.5 via Supabase Edge Function (`kreis-parse-event`)
- **Hosting:** GitHub Pages

## Development

```bash
python3 -m http.server 8094 --directory .
open http://localhost:8094/
```

## Datenschutz

Keine Nutzer-Accounts, keine Tracking-Cookies, kein Analytics. Einzige gespeicherte Daten:
- Eventdaten (Titel, Datum, Ort) in Supabase EU-West
- Abstimmungen mit Namen (den Leute selbst eingeben)
- Eigene erstellte Events in deinem Browser-localStorage

Event-Creator kann Events jederzeit löschen — dann gehen auch alle Antworten weg.

## Lizenz

Privates Tool. Kein Support. Bau dir deins wenn du magst.

---

**Scratch your own itch.**
