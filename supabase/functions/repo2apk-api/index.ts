import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const githubRepo = Deno.env.get("GITHUB_REPOSITORY") || "lawalfataikola123/Repo2apk2";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Supabase function secrets are not configured." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Sign in is required." }, 401);
  }

  const token = authHeader.slice(7);
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Session is invalid or expired." }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: Record<string, unknown> = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const action = String(body.action || new URL(req.url).searchParams.get("action") || "history");
  const userId = userData.user.id;

  if (action === "history") {
    const { data, error } = await admin
      .from("repo2apk_builds")
      .select("id,repo_url,build_type,status,github_run_id,artifact_name,download_url,logs,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return json({ error: "Could not load build history." }, 500);
    return json({ builds: data || [] });
  }

  if (action === "start") {
    if (!githubToken) return json({ error: "Build service is not configured yet." }, 503);
    const repoUrl = String(body.repoUrl || "").trim().replace(/\\.git$/, "").replace(/\\/$/, "");
    const buildType = String(body.buildType || "auto");
    const validRepo = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoUrl);
    if (!validRepo) return json({ error: "Enter a valid public GitHub repository URL." }, 400);
    if (!["auto", "gradle", "flutter", "react-native"].includes(buildType)) {
      return json({ error: "Unsupported build type." }, 400);
    }

    const { data: entitlement, error: entitlementError } = await admin
      .from("repo2apk_entitlements")
      .select("lifetime,active_until")
      .eq("user_id", userId)
      .maybeSingle();
    const active = !entitlementError && entitlement &&
      (entitlement.lifetime === true ||
       (entitlement.active_until && new Date(entitlement.active_until).getTime() > Date.now()));
    if (!active) return json({ error: "An active Repo2APK plan is required before building." }, 402);

    const { data: build, error: insertError } = await admin
      .from("repo2apk_builds")
      .insert({ user_id: userId, repo_url: repoUrl, build_type: buildType, status: "queued" })
      .select("id")
      .single();
    if (insertError || !build) return json({ error: "Could not create build record." }, 500);

    const dispatch = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/build-apk.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { repo_url: repoUrl, build_type: buildType, build_id: build.id },
        }),
      },
    );

    if (!dispatch.ok) {
      await admin.from("repo2apk_builds").update({ status: "failed", logs: [{ message: "GitHub workflow dispatch failed." }] }).eq("id", build.id);
      return json({ error: "Could not start the GitHub build workflow." }, 502);
    }

    return json({ buildId: build.id, status: "queued" }, 202);
  }

  if (action === "status") {
    const buildId = String(body.buildId || new URL(req.url).searchParams.get("buildId") || "");
    const { data: build, error } = await admin
      .from("repo2apk_builds")
      .select("id,repo_url,build_type,status,github_run_id,artifact_name,download_url,logs,created_at,updated_at")
      .eq("id", buildId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !build) return json({ error: "Build not found." }, 404);
    return json({ build });
  }

  return json({ error: "Unknown action." }, 400);
});
