// KREIS — Full Invite Composer v5
// V3 Changes:
// - Accepts `stories[]` parallel to `user_names[]` → Claude uses them for scene ideas
// - Accepts `guest_of_honor` → "ehrengast mode" (Hypothese A): scenes celebrate the
//   absent honoree, participating friends are the producers of the invitation
// - Identity refs only for participating guests (Ehrengast has no photo)

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const GEMINI_MODEL = "gemini-3-pro-image-preview";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const IDENTITY_THRESHOLD = 6;
const MIN_IDENTITY_SHOW = 4;
const MAX_RETRIES_PER_SCENE = 1;

const rateMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 3600000;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now - e.windowStart > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  return true;
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(), "Content-Type": "application/json" } });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface EventRow {
  id: string; title: string; location: string | null; date_start: string | null;
  date_end: string | null; note: string | null; link: string | null; created_by: string;
  guest_of_honor: string | null;
}
interface ComposePlan {
  event_type: string; description: string; song_hook: string;
  scenes: { title: string; prompt: string }[];
}

function heightDesc(userNames: string[], heightsCm: number[]): string {
  if (!heightsCm || heightsCm.length !== userNames.length) return "";
  const pairs = userNames.map((n, i) => ({ name: n, cm: heightsCm[i] })).filter((p) => p.cm);
  if (pairs.length < 2) return "";
  const sorted = [...pairs].sort((a, b) => b.cm - a.cm);
  const diff = sorted[0].cm - sorted[sorted.length - 1].cm;
  const s = pairs.map((p) => `${p.name} ${p.cm}cm`).join(", ");
  return `HEIGHTS: ${s}. Height diff ${diff}cm — ${sorted[0].name} must be visibly TALLER than ${sorted[sorted.length - 1].name}.`;
}

function storiesBlock(userNames: string[], stories: string[]): string {
  if (!stories || stories.length === 0) return "";
  const pairs = userNames.map((n, i) => ({ name: n, story: (stories[i] || "").trim() })).filter((p) => p.story);
  if (pairs.length === 0) return "";
  return `STORIES shared by the friends (use these to inspire scene themes, emotional beats, inside jokes — don't literally recreate, abstract into visual metaphors):\n${pairs.map((p) => `- ${p.name}: "${p.story.slice(0, 400)}"`).join("\n")}`;
}

async function callClaude(
  event: EventRow,
  userNames: string[],
  heightsCm: number[],
  stories: string[],
): Promise<ComposePlan> {
  const hh = heightDesc(userNames, heightsCm);
  const st = storiesBlock(userNames, stories);
  const hasHonoree = !!event.guest_of_honor;
  const pos = userNames.length === 2 ? `POSITION LOCK: ${userNames[0]} on LEFT, ${userNames[1]} on RIGHT.` : "";

  const modeBlock = hasHonoree
    ? `MODE: Ehrengast-Einladung. Die anwesenden Freunde (${userNames.join(", ")}) produzieren eine Einladung FÜR ${event.guest_of_honor}. ${event.guest_of_honor} ist NICHT im Bild (wir haben keine Referenz). Die Szenen zeigen die Freunde:
- wie sie die Überraschung vorbereiten
- mit Erinnerungsstücken, Fotos, leerem Stuhl, etc.
- wartend, hoffnungsvoll, komplizenhaft — "wir warten auf ${event.guest_of_honor}"
Jede Scene hat symbolischen Platz für den Abwesenden: leerer Platz, zugehaltener Stuhl, Foto in der Hand, Blick in die Ferne.`
    : `MODE: Gruppen-Einladung. Alle Teilnehmer (${userNames.join(", ")}) sind im Bild, gemeinsam auf dem Weg zum Event.`;

  const prompt = `Du bist Einladungs-Designer für KREIS.

Event:
- Titel: ${event.title}
- Ort: ${event.location || "nicht angegeben"}
- Datum: ${event.date_start || ""}
- Notiz: ${event.note || "keine"}

Teilnehmer (mit Referenz-Fotos): ${userNames.join(", ")}
${hasHonoree ? `Ehrengast (OHNE Foto, abwesend): ${event.guest_of_honor}` : ""}
${hh}
${pos}

${modeBlock}

${st}

Gib nur valides JSON:
{
  "event_type": "concert|climbing|party|dinner|outdoor|festival|birthday|surprise|other",
  "description": "100-150 Zeichen, warmherzig, deutsch, Du-Form${hasHonoree ? `, addressiert an ${event.guest_of_honor}` : ""}",
  "song_hook": "1 Zeile Hook, deutsch${hasHonoree ? `, addressiert an ${event.guest_of_honor}` : ""}",
  "scenes": [
    {"title": "Der Einstieg", "prompt": "Englisch — Ankommen${hasHonoree ? " / Vorbereiten der Überraschung" : ""}"},
    {"title": "Peak Moment", "prompt": "Englisch — Hauptmoment${hasHonoree ? " / symbolischer Platz für ${event.guest_of_honor}" : ""}"},
    {"title": "Zusammen", "prompt": "Englisch — Verbindung${hasHonoree ? " / die Freunde mit Erinnerungsstück" : ""}"},
    {"title": "Erinnerung", "prompt": "Englisch — Nachgefühl / Hoffnung${hasHonoree ? " / Blick in die Ferne" : ""}"}
  ]
}

Jeder scene.prompt MUSS:
- "EXACTLY ${userNames.length} persons total in the frame"
- "each person appears ONCE, no duplicates"
- Identity-Preservation ("use reference images exactly")
- Event-spezifisch
- Keine Logos/Brand-Namen (safety)
- Keine Zigaretten
${hasHonoree ? `- Symbolischer Platz / Hinweis auf den abwesenden Ehrengast (leerer Stuhl, Foto in der Hand, Blick in die Ferne, etc.) — ohne ${event.guest_of_honor} im Bild zu zeigen` : ""}
- Nutze Stories (falls vorhanden) als visuelle Inspiration, nicht als literal recreation`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2200, messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) throw new Error(`Claude plan ${resp.status}`);
  const data = await resp.json();
  const t = data?.content?.[0]?.text || "";
  const a = t.indexOf("{"); const b = t.lastIndexOf("}");
  return JSON.parse(t.slice(a, b + 1)) as ComposePlan;
}

async function fetchAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Face-Fetch ${resp.status}`);
  const mimeType = resp.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await resp.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  return { data: btoa(binary), mimeType };
}

async function callGemini(faces: { data: string; mimeType: string }[], prompt: string): Promise<string> {
  const parts: Array<Record<string, unknown>> = faces.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } }));
  parts.push({ text: prompt });
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], temperature: 0.4 } }) },
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const cand = data.candidates?.[0];
  const imgPart = cand?.content?.parts?.find((p: Record<string, unknown>) => (p as { inlineData?: unknown }).inlineData);
  if (!imgPart?.inlineData?.data) throw new Error(`Gemini: no image (${cand?.finishReason || "?"})`);
  return imgPart.inlineData.data as string;
}

interface JudgeResult { score: number; verdict: "match" | "similar" | "different"; issues: string[]; }
async function judgeIdentity(
  sceneB64: string,
  sceneMime: string,
  refFaces: { data: string; mimeType: string }[],
  userNames: string[],
): Promise<JudgeResult> {
  const refContent = refFaces.map((f, i) => ([
    { type: "image", source: { type: "base64", media_type: f.mimeType, data: f.data } },
    { type: "text", text: `^ Reference image ${i + 1}: ${userNames[Math.min(i, userNames.length - 1)]}` },
  ])).flat();

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          ...refContent,
          { type: "image", source: { type: "base64", media_type: sceneMime, data: sceneB64 } },
          { type: "text", text: `^ Generated scene.

Task: Verify the identity of the persons in the generated scene matches the reference images.

Expected persons: ${userNames.join(", ")} (${userNames.length} person${userNames.length > 1 ? "s" : "s"} total).

Rate identity preservation from 0-10:
- 10: Pixel-perfect match
- 8-9: Clearly the same people, minor differences
- 6-7: Probably same, noticeable drift
- 4-5: Similar vibe, identity drift
- 2-3: Different people, vague resemblance
- 0-1: Completely different

Check: correct count (no clones), facial features match, proportions consistent.

Return ONLY valid JSON:
{"score": 0-10, "verdict": "match|similar|different", "issues": ["..."]}` },
        ],
      }],
    }),
  });
  if (!resp.ok) return { score: 6, verdict: "similar", issues: ["judge-fail-open"] };
  const data = await resp.json();
  const t = data?.content?.[0]?.text || "";
  const a = t.indexOf("{"); const b = t.lastIndexOf("}");
  if (a < 0 || b < 0) return { score: 6, verdict: "similar", issues: ["judge-parse-fail"] };
  try {
    const parsed = JSON.parse(t.slice(a, b + 1));
    const score = Math.max(0, Math.min(10, Number(parsed.score) || 0));
    return {
      score,
      verdict: parsed.verdict || (score >= 7 ? "match" : score >= 4 ? "similar" : "different"),
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
    };
  } catch {
    return { score: 6, verdict: "similar", issues: ["judge-json-fail"] };
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
async function uploadToStorage(bytes: Uint8Array, eventId: string, tag: string): Promise<string> {
  const path = `${eventId}/compose-${tag}-${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from("kreis-generated").upload(path, bytes, { contentType: "image/png" });
  if (error) throw new Error(`Storage upload: ${error.message}`);
  return supabase.storage.from("kreis-generated").getPublicUrl(path).data.publicUrl;
}
async function logGenerated(eventId: string, url: string, meta: Record<string, unknown>): Promise<void> {
  await supabase.from("kreis_generated").insert({ event_id: eventId, kind: "scene_image", url, meta });
}

interface SceneResult {
  title: string; prompt: string; image_url: string | null;
  identity_score: number | null; verdict: string | null; issues: string[];
  shown: boolean; error?: string;
}
async function generateAndJudge(
  scene: { title: string; prompt: string },
  sceneIdx: number,
  faces: { data: string; mimeType: string }[],
  dupGuard: string,
  refFacesForJudge: { data: string; mimeType: string }[],
  userNames: string[],
  eventId: string,
  composeRunId: string,
): Promise<SceneResult> {
  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_SCENE; attempt++) {
    try {
      const emphasis = attempt > 0
        ? ` [RETRY ${attempt}]: Previous attempt had identity drift. Be EXTRA STRICT with facial features.`
        : "";
      const full = `${scene.prompt}\n\n${dupGuard}\n\nIDENTITY LOCK: First ${faces.length} images are references of: ${userNames.join(", ")}.${emphasis}`;
      const b64 = await callGemini(faces, full);
      const judge = await judgeIdentity(b64, "image/png", refFacesForJudge, userNames);
      const bytes = base64ToBytes(b64);
      const url = await uploadToStorage(bytes, eventId, `s${sceneIdx + 1}-a${attempt}`);
      await logGenerated(eventId, url, {
        scene_title: scene.title,
        scene_prompt: scene.prompt.slice(0, 500),
        scene_idx: sceneIdx,
        model: GEMINI_MODEL,
        user_names: userNames,
        attempt,
        judge,
        compose_run: composeRunId,
      });
      if (judge.score >= IDENTITY_THRESHOLD || attempt === MAX_RETRIES_PER_SCENE) {
        return {
          title: scene.title, prompt: scene.prompt, image_url: url,
          identity_score: judge.score, verdict: judge.verdict, issues: judge.issues,
          shown: judge.score >= MIN_IDENTITY_SHOW,
        };
      }
      lastError = `Attempt ${attempt + 1} score=${judge.score}, issues=${judge.issues.join("; ")}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return {
    title: scene.title, prompt: scene.prompt, image_url: null,
    identity_score: null, verdict: "failed", issues: [lastError],
    shown: false, error: lastError,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY missing" }, 500);
  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY missing" }, 500);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) return json({ error: "Rate limit: 5 composes/hour" }, 429);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  const faceUrls = Array.isArray(body.face_urls) ? body.face_urls.filter((u): u is string => typeof u === "string") : [];
  const userNames = Array.isArray(body.user_names) ? body.user_names.filter((n): n is string => typeof n === "string") : [];
  const heightsCm = Array.isArray(body.user_heights_cm) ? body.user_heights_cm.filter((n): n is number => typeof n === "number") : [];
  const stories = Array.isArray(body.stories) ? body.stories.map((s) => typeof s === "string" ? s : "") : [];

  if (!eventId || faceUrls.length === 0) return json({ error: "event_id + face_urls required" }, 400);
  if (faceUrls.length > 4) return json({ error: "Max 4 faces" }, 400);

  try {
    const { data: event, error: evErr } = await supabase.from("kreis_events").select("*").eq("id", eventId).single();
    if (evErr || !event) throw new Error(`Event not found`);

    const names = userNames.length ? userNames : [event.created_by];
    const plan = await callClaude(event as EventRow, names, heightsCm, stories);
    const faces = await Promise.all(faceUrls.map(fetchAsBase64));
    const composeRunId = new Date().toISOString();

    const heightHint = heightDesc(names, heightsCm);
    const honoreeHint = event.guest_of_honor
      ? `- The honoree ${event.guest_of_honor} is NOT in the frame (no reference photo). Show symbolic presence (empty seat, photo held in hand, gaze into distance).`
      : "";
    const dupGuard = `CRITICAL RULES:
- EXACTLY ${names.length} persons in frame, no more, no less.
- EACH person appears ONCE (no clones/twins).
- ${names.join(" and ")} are distinct individuals.
${heightHint ? `- ${heightHint}\n` : ""}${names.length === 2 ? `- ${names[0]} LEFT, ${names[1]} RIGHT.\n` : ""}${honoreeHint}`;

    const sceneResults = await Promise.allSettled(
      plan.scenes.map((s, i) => generateAndJudge(s, i, faces, dupGuard, faces, names, eventId, composeRunId)),
    );
    const scenes: SceneResult[] = sceneResults.map((r, i) => r.status === "fulfilled" ? r.value : {
      title: plan.scenes[i].title, prompt: plan.scenes[i].prompt, image_url: null,
      identity_score: null, verdict: "failed", issues: [String(r.reason).slice(0, 200)], shown: false, error: String(r.reason),
    });

    const shownCount = scenes.filter((s) => s.shown).length;
    const scoredScenes = scenes.filter((s) => s.identity_score != null);
    const avgScore = scoredScenes.length
      ? scoredScenes.reduce((a, s) => a + (s.identity_score || 0), 0) / scoredScenes.length
      : null;

    return json({
      ok: true,
      mode: event.guest_of_honor ? "ehrengast" : "group",
      guest_of_honor: event.guest_of_honor,
      event_type: plan.event_type,
      description: plan.description,
      song_hook: plan.song_hook,
      scenes,
      compose_run: composeRunId,
      success_count: scenes.filter((s) => s.image_url).length,
      shown_count: shownCount,
      total: scenes.length,
      avg_identity_score: avgScore ? Number(avgScore.toFixed(1)) : null,
      threshold: { retry_below: IDENTITY_THRESHOLD, hide_below: MIN_IDENTITY_SHOW },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[compose v5] ${msg}`);
    return json({ error: "Compose failed", detail: msg }, 500);
  }
});
