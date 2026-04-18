// kreis-auto-render v2 — Orchestrator (Boot-safe)
// Changes vs v1: createClient lazy inside handler, EdgeRuntime reference via globalThis,
// fallback to blocking await if EdgeRuntime.waitUntil unavailable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const MAX_RENDERS_PER_EVENT = 3;
const DEFAULT_THRESHOLD = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Supabase env missing" }, 500);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { event_id?: string; force?: boolean; creator_name?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { event_id, force = false, creator_name } = body;
  if (!event_id) return json({ error: "event_id required" }, 400);

  const [evRes, respRes, facesRes] = await Promise.all([
    sb.from("kreis_events").select("*").eq("id", event_id).single(),
    sb.from("kreis_responses").select("*").eq("event_id", event_id).eq("wizard_completed", true).order("created_at", { ascending: true }),
    sb.from("kreis_faces").select("*").eq("event_id", event_id).order("created_at", { ascending: true }),
  ]);

  if (evRes.error || !evRes.data) return json({ error: "Event not found" }, 404);
  const event = evRes.data;
  const completed = respRes.data || [];
  const allFaces = facesRes.data || [];

  const threshold = event.auto_render_threshold ?? DEFAULT_THRESHOLD;
  const renderCount = event.render_count ?? 0;

  if (renderCount >= MAX_RENDERS_PER_EVENT) {
    return json({ triggered: false, reason: "render_limit_reached", render_count: renderCount, max: MAX_RENDERS_PER_EVENT });
  }

  if (completed.length < threshold && !force) {
    return json({ triggered: false, reason: "not_enough_guests", completed_count: completed.length, threshold });
  }

  if (!force && event.auto_render_triggered_at) {
    return json({
      triggered: false, reason: "already_auto_triggered",
      triggered_at: event.auto_render_triggered_at,
      render_count: renderCount,
      hint: "Use force=true for creator-refresh",
    });
  }

  const completedNames = new Set(completed.map((r: { user_name: string }) => r.user_name.toLowerCase()));
  const matchedFaces = allFaces.filter((f: { user_name: string }) => completedNames.has(f.user_name.toLowerCase()));

  if (matchedFaces.length === 0) {
    return json({ triggered: false, reason: "no_faces_uploaded", completed_count: completed.length });
  }

  const facesToUse = matchedFaces.slice(0, 4);

  const nowIso = new Date().toISOString();
  let lockQuery = sb.from("kreis_events")
    .update({
      auto_render_triggered_at: nowIso,
      last_rendered_at: nowIso,
      render_count: renderCount + 1,
    })
    .eq("id", event_id);

  if (!force) {
    lockQuery = lockQuery.is("auto_render_triggered_at", null);
  }

  const { data: lockRes, error: lockErr } = await lockQuery.select().single();
  if (lockErr || !lockRes) {
    return json({ triggered: false, reason: "lock_race_lost", detail: lockErr?.message || "Row not updated" });
  }

  const signedFaces: { user_name: string; signed_url: string }[] = [];
  for (const face of facesToUse) {
    const { data: sig } = await sb.storage.from("kreis-faces").createSignedUrl(face.storage_path, 7200);
    if (sig?.signedUrl) {
      signedFaces.push({ user_name: face.user_name, signed_url: sig.signedUrl });
    }
  }

  if (signedFaces.length === 0) {
    await sb.from("kreis_events").update({
      auto_render_triggered_at: force ? event.auto_render_triggered_at : null,
      render_count: renderCount,
      last_rendered_at: event.last_rendered_at,
    }).eq("id", event_id);
    return json({ triggered: false, reason: "signed_urls_failed" });
  }

  const userNames = signedFaces.map((f) => f.user_name);
  const stories = userNames.map((name) => {
    const resp = completed.find((r: { user_name: string; story_text?: string | null }) =>
      r.user_name.toLowerCase() === name.toLowerCase()
    );
    return resp?.story_text || "";
  });

  const inviteBody = JSON.stringify({
    event_id,
    face_urls: signedFaces.map((f) => f.signed_url),
    user_names: userNames,
    user_heights_cm: [],
    stories,
  });
  const songBody = JSON.stringify({ event_id });
  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
  };

  const composeInvitePromise = fetch(`${SUPABASE_URL}/functions/v1/kreis-compose-invite`, {
    method: "POST", headers: authHeaders, body: inviteBody,
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }));

  const composeSongPromise = fetch(`${SUPABASE_URL}/functions/v1/kreis-compose-song`, {
    method: "POST", headers: authHeaders, body: songBody,
  }).then((r) => r.json()).catch((e) => ({ error: String(e) }));

  // Try to detach via EdgeRuntime.waitUntil — if unavailable, fall back to blocking.
  const bothPromises = Promise.allSettled([composeInvitePromise, composeSongPromise]);
  let mode: "fire_and_forget" | "blocking" = "blocking";
  const edgeRt = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (edgeRt?.waitUntil) {
    try {
      edgeRt.waitUntil(bothPromises);
      mode = "fire_and_forget";
    } catch {
      // fall through
    }
  }

  const responsePayload = {
    triggered: true,
    orchestration_mode: mode,
    trigger_mode: force ? "creator_refresh" : "auto_threshold",
    event_id,
    render_count: renderCount + 1,
    max: MAX_RENDERS_PER_EVENT,
    completed_count: completed.length,
    faces_used: signedFaces.length,
    stories_provided: stories.filter(Boolean).length,
    guest_of_honor: event.guest_of_honor,
    creator_name,
    started_at: nowIso,
    hint: "Poll kreis_generated WHERE event_id=X. Scenes ~30-60s, song ~60-180s.",
  };

  if (mode === "blocking") {
    // Await both so they actually run before the worker dies
    const [inviteResult, songResult] = await bothPromises;
    return json({
      ...responsePayload,
      compose_invite: inviteResult.status === "fulfilled" ? { ok: true } : { ok: false, reason: String(inviteResult.reason) },
      compose_song: songResult.status === "fulfilled" ? { ok: true } : { ok: false, reason: String(songResult.reason) },
    });
  }

  return json(responsePayload);
});
