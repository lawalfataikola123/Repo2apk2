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
    let repoUrl = String(body.repoUrl || "").trim();
    if (repoUrl.endsWith(".git")) repoUrl = repoUrl.slice(0, -4);
    if (repoUrl.endsWith("/")) repoUrl = repoUrl.slice(0, -1);
    const buildType = String(body.buildType || "auto");
    const validRepo = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoUrl);
    if (!validRepo) return json({ error: "Enter a valid public GitHub repository URL." }, 400);
    if (!["auto", "gradle"].includes(buildType)) {
      return json({ error: "This workflow currently supports Auto Detect and Native Android/Gradle builds." }, 400);
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

  if (action === "status" || action === "download") {
    const buildId = String(body.buildId || new URL(req.url).searchParams.get("buildId") || "");
    const { data: build, error } = await admin
      .from("repo2apk_builds")
      .select("id,repo_url,build_type,status,github_run_id,artifact_name,download_url,logs,created_at,updated_at")
      .eq("id", buildId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !build) return json({ error: "Build not found." }, 404);
    if (!githubToken) return json({ error: "Build service is not configured yet." }, 503);

    if (action === "download") {
      if (!build.github_run_id || build.status !== "success") {
        return json({ error: "APK is not ready for download." }, 409);
      }
      const artifactsRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/runs/${build.github_run_id}/artifacts`,
        { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" } },
      );
      if (!artifactsRes.ok) return json({ error: "Could not retrieve build artifact." }, 502);
      const artifacts = await artifactsRes.json();
      const artifact = (artifacts.artifacts || []).find((item: { name: string; expired: boolean }) => item.name === "app-debug" && !item.expired);
      if (!artifact) return json({ error: "Build artifact has expired or is missing." }, 404);
      const archive = await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/artifacts/${artifact.id}/zip`,
        { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" }, redirect: "manual" },
      );
      const location = archive.headers.get("location");
      if (location) return new Response(null, { status: 302, headers: { Location: location } });
      return json({ error: "Could not create artifact download link." }, 502);
    }

    if (!build.github_run_id) {
      const runsRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/workflows/build-apk.yml/runs?branch=main&event=workflow_dispatch&per_page=30`,
        { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" } },
      );
      if (runsRes.ok) {
        const runs = await runsRes.json();
        const run = (runs.workflow_runs || []).find((item: { display_title?: string; name?: string }) =>
          item.display_title === `Repo2APK-${build.id}` || item.name === `Repo2APK-${build.id}`);
        if (run) build.github_run_id = run.id;
      }
    }

    if (build.github_run_id) {
      const runRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/runs/${build.github_run_id}`,
        { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" } },
      );
      if (runRes.ok) {
        const run = await runRes.json();
        let status = build.status;
        if (run.status === "completed") status = run.conclusion === "success" ? "success" : "failed";
        else if (run.status === "in_progress") status = "running";
        else status = "queued";
        const downloadUrl = status === "success"
          ? `/functions/v1/repo2apk-api?action=download&buildId=${build.id}`
          : null;
        const updates = {
          github_run_id: run.id,
          status,
          artifact_name: status === "success" ? "app-debug" : null,
          download_url: downloadUrl,
          updated_at: new Date().toISOString(),
          logs: status === "failed" ? [{ message: "GitHub Actions build failed. Open the run in GitHub Actions for the detailed log." }] : build.logs,
        };
        await admin.from("repo2apk_builds").update(updates).eq("id", build.id).eq("user_id", userId);
        Object.assign(build, updates);
      }
    }
    return json({ build });
  }

  return json({ error: "Unknown action." }, 400);
});
