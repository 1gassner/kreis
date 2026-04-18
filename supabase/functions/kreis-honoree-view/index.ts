// kreis-honoree-view v1 — Token-based Ehrengast-Landing
// The creator shares `?token=<share_token>` with the honoree.
// This endpoint looks up the event by token and returns the complete
// "invitation package" (event + scenes + song) in one call.
// Side effect: first access sets `film_shared_at` (creator sees "Nino opened it at X").
//
// Anon-safe: token acts as secret. Anyone with the link can view.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Supabase env missing" }, 500);
  }

  // Accept token via ?token= or POST body
  let token: string | null = null;
  const url = new URL(req.url);
  token = url.searchParams.get("token");
  if (!token && req.method === "POST") {
    try {
      const body = await req.json();
      token = typeof body.token === "string" ? body.token : null;
    } catch { /* ignore */ }
  }
  if (!token) return json({ error: "token required" }, 400);

  // Validate UUID-ish (prevent arbitrary injection)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return json({ error: "invalid token format" }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Lookup event by share_token
  const { data: event, error: evErr } = await sb
    .from("kreis_events")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();

  if (evErr) return json({ error: "db_error", detail: evErr.message }, 500);
  if (!event) return json({ error: "event_not_found" }, 404);

  // 2. Parallel: scenes, song, responses (for contributor names)
  const [scenesRes, songRes, respRes] = await Promise.all([
    sb.from("kreis_generated").select("*").eq("event_id", event.id).eq("kind", "scene_image").order("created_at", { ascending: true }),
    sb.from("kreis_generated").select("*").eq("event_id", event.id).eq("kind", "song").order("created_at", { ascending: false }).limit(1),
    sb.from("kreis_responses").select("user_name, response, created_at").eq("event_id", event.id).eq("wizard_completed", true).order("created_at", { ascending: true }),
  ]);

  const allScenes = scenesRes.data || [];
  const song = songRes.data?.[0] || null;
  const contributors = (respRes.data || []).map((r: { user_name: string; response: string }) => ({
    name: r.user_name,
    response: r.response,
  }));

  // Group scenes by compose_run and pick the latest run (most recent 4 scenes by run-id)
  const byRun = new Map<string, typeof allScenes>();
  for (const s of allScenes) {
    const run = (s.meta as { compose_run?: string })?.compose_run || "unknown";
    if (!byRun.has(run)) byRun.set(run, []);
    byRun.get(run)!.push(s);
  }
  const runs = Array.from(byRun.entries()).sort((a, b) =>
    (b[1][0]?.created_at || "").localeCompare(a[1][0]?.created_at || "")
  );
  const latestRun = runs[0]?.[1] || allScenes.slice(-4);

  const scenes = latestRun
    .map((s) => {
      const meta = (s.meta || {}) as Record<string, unknown>;
      return {
        title: (meta.scene_title as string) || "Szene",
        image_url: s.url,
        scene_idx: (meta.scene_idx as number) ?? null,
        identity_score: (meta.judge as { score?: number } | undefined)?.score ?? null,
      };
    })
    .sort((a, b) => (a.scene_idx ?? 0) - (b.scene_idx ?? 0));

  // 3. Side effect: first-access tracking (fire-and-forget)
  let firstAccess = false;
  if (!event.film_shared_at) {
    firstAccess = true;
    // Update silently — don't block response if it fails
    sb.from("kreis_events")
      .update({ film_shared_at: new Date().toISOString() })
      .eq("id", event.id)
      .then(() => {})
      .catch(() => {});
  }

  const songMeta = (song?.meta || {}) as Record<string, unknown>;
  return json({
    ok: true,
    first_access: firstAccess,
    event: {
      id: event.id,
      title: event.title,
      location: event.location,
      date_start: event.date_start,
      date_end: event.date_end,
      link: event.link,
      note: event.note,
      created_by: event.created_by,
      guest_of_honor: event.guest_of_honor,
      film_shared_at: event.film_shared_at || new Date().toISOString(),
    },
    contributors,
    scenes,
    song: song
      ? {
          audio_url: song.url,
          title: songMeta.song_title || null,
          style: songMeta.style_of_music || null,
          image_url: songMeta.image_url || null,
          duration_sec: songMeta.duration_sec || null,
          status: songMeta.suno_status || "unknown",
        }
      : null,
    meta: {
      scenes_in_latest_run: scenes.length,
      render_count: event.render_count || 0,
      mode: event.guest_of_honor ? "ehrengast" : "group",
    },
  });
});
