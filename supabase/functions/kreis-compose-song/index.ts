// kreis-compose-song: Personalisierte Song-Lyrics via Claude Haiku + optional Suno API
// Deploy: supabase functions deploy kreis-compose-song --no-verify-jwt
//
// Env vars needed:
//   ANTHROPIC_API_KEY  — für Claude Haiku Lyrics
//   SUNO_API_KEY       — optional, für automatische Song-Generierung (sunoapi.org)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { event_id, guest_names, style_hint } = await req.json();
    if (!event_id) return json({ error: "event_id required" }, 400);

    // --- Supabase: Event + Responses laden ---
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: event, error: evErr } = await sb
      .from("kreis_events")
      .select("*")
      .eq("id", event_id)
      .single();
    if (evErr || !event) return json({ error: "Event not found" }, 404);

    const { data: responses } = await sb
      .from("kreis_responses")
      .select("*")
      .eq("event_id", event_id)
      .order("created_at", { ascending: true });

    // --- Gäste-Kontext ---
    const guests: { name: string; response: string; note: string | null }[] = [];
    if (guest_names?.length) {
      for (const name of guest_names) {
        const r = responses?.find(
          (r: any) => r.user_name.toLowerCase() === name.toLowerCase(),
        );
        guests.push({ name, response: r?.response || "unknown", note: r?.note || null });
      }
    } else if (responses?.length) {
      for (const r of responses as any[]) {
        guests.push({ name: r.user_name, response: r.response, note: r.note });
      }
    }

    const guestBlock = guests
      .map((g) => `- ${g.name} (${g.response}${g.note ? `, "${g.note}"` : ""})`)
      .join("\n");

    const dateStr = event.date_start
      ? `${event.date_start}${event.date_end && event.date_end !== event.date_start ? ` bis ${event.date_end}` : ""}`
      : "Datum offen";

    const finalStyle = style_hint || guessStyle(event.title, event.note);

    // --- Claude Haiku: Lyrics generieren ---
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

    const prompt = `Du bist ein Songwriter für personalisierte Einladungs-Songs. Der Song motiviert Freunde, gemeinsam zu einem Event zu gehen.

EVENT:
- Titel: ${event.title}
- Ort: ${event.location || "nicht angegeben"}
- Datum: ${dateStr}
- Notiz: ${event.note || "keine"}
- Von: ${event.created_by}

GÄSTE:
${guestBlock || "- Noch keine"}

STYLE: ${finalStyle}

REGELN:
1. Deutsch (außer Style verlangt Englisch, z.B. englische Band)
2. Jeden Gast mindestens 1x namentlich erwähnen, mit Bezug zu Note/Anmerkung
3. Eingängiger Refrain passend zum Event
4. Humor und Insider-Vibes erwünscht
5. Suno-Format: [Intro], [Verse 1], [Chorus], [Verse 2], [Chorus], [Outro]
6. Max ~150 Wörter (ca. 60 Sekunden gesungen)
7. Gib einen "Style of Music"-Tag für Suno (1 Zeile)

Antworte NUR mit diesem JSON:
{"lyrics":"...kompletter Text mit [Tags]...","style_of_music":"...","title":"...kurzer Titel..."}`;

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      return json({ error: `Claude ${claudeResp.status}`, detail: errText }, 502);
    }

    const raw = (await claudeResp.json()).content?.[0]?.text || "";

    let lyrics: string, styleOfMusic: string, songTitle: string;
    try {
      // Strip Markdown code fences first (```json ... ``` or ``` ... ```)
      const stripped = raw
        .replace(/^\s*```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      // Find the outermost JSON object
      const first = stripped.indexOf("{");
      const last = stripped.lastIndexOf("}");
      if (first < 0 || last < 0) throw new Error("no JSON");
      const p = JSON.parse(stripped.slice(first, last + 1));
      lyrics = p.lyrics || raw;
      styleOfMusic = p.style_of_music || finalStyle;
      songTitle = p.title || `${event.title} Song`;
    } catch {
      lyrics = raw;
      styleOfMusic = finalStyle;
      songTitle = `${event.title} Song`;
    }

    // --- Optional: Suno API (sunoapi.org custom_generate) ---
    const sunoKey = Deno.env.get("SUNO_API_KEY");
    let sunoTaskId: string | null = null;
    let sunoStatus = "no_api_key";

    if (sunoKey) {
      try {
        const sunoResp = await fetch(
          "https://apibox.erweima.ai/api/v1/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sunoKey}`,
            },
            body: JSON.stringify({
              prompt: lyrics,
              style: styleOfMusic,
              title: songTitle,
              customMode: true,
              instrumental: false,
              model: "V4",
            }),
          },
        );
        if (sunoResp.ok) {
          const d = await sunoResp.json();
          sunoTaskId = d.data?.taskId || null;
          sunoStatus = sunoTaskId ? "generating" : "no_task_id";
        } else {
          sunoStatus = `suno_http_${sunoResp.status}`;
        }
      } catch (e) {
        sunoStatus = `suno_error: ${(e as Error).message}`;
      }
    }

    // --- Speichern in kreis_generated ---
    await sb.from("kreis_generated").insert({
      event_id,
      kind: "song_lyrics",
      url: null,
      meta: {
        lyrics,
        style_of_music: styleOfMusic,
        song_title: songTitle,
        suno_task_id: sunoTaskId,
        suno_status: sunoStatus,
        guest_names: guests.map((g) => g.name),
      },
    });

    return json({
      lyrics,
      style_of_music: styleOfMusic,
      song_title: songTitle,
      suno_task_id: sunoTaskId,
      suno_status: sunoStatus,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

// --- Style-Guesser ---
function guessStyle(title: string, note: string | null): string {
  const t = `${title} ${note || ""}`.toLowerCase();

  const map: [RegExp, string][] = [
    [/prodigy/, "Electronic, Big Beat, Rave, aggressive, 140 BPM"],
    [/rammstein/, "Industrial Metal, German vocals, heavy, 130 BPM"],
    [/depeche\s*mode/, "Synth-Pop, melancholic, 120 BPM"],
    [/kraftwerk/, "Electronic, Krautrock, minimal, 110 BPM"],
    [/onkelz/, "Deutschrock, raspy vocals, 125 BPM"],
    [/ärzte|aerzte/, "Punk Rock, funny German, 160 BPM"],
    [/toten\s*hosen/, "German Punk Rock, anthemic, 150 BPM"],
    [/techno|rave/, "Techno, driving beats, 135 BPM"],
    [/festival/, "EDM, Festival Anthem, euphoric, 128 BPM"],
    [/hip\s*hop|rap/, "German Hip Hop, boom bap, 95 BPM"],
    [/metal/, "Heavy Metal, aggressive, 140 BPM"],
    [/rock/, "Rock, guitar-driven, 130 BPM"],
    [/jazz/, "Jazz, smooth, 100 BPM"],
    [/schlager/, "Schlager, party, 130 BPM"],
    [/kletter|boulder/, "Indie Rock, adventurous, 125 BPM"],
    [/wander|berg|alp/, "Folk, acoustic, German, 100 BPM"],
    [/schwimm|see|strand|beach/, "Reggae, chill, summer, 95 BPM"],
    [/kino|film/, "Cinematic, orchestral, 110 BPM"],
    [/grill|bbq|feuer/, "Country, acoustic, laid-back, 105 BPM"],
    [/party|feier|geburtstag/, "Pop, dance, German party, 128 BPM"],
    [/ski|snow|winter/, "Après-Ski, Schlager-Pop, party, 135 BPM"],
  ];

  for (const [re, style] of map) {
    if (re.test(t)) return style;
  }
  return "Pop, catchy, German vocals, feel-good, 120 BPM";
}
