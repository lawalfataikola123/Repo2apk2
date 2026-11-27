// Repo2APK standalone payment function; deployed separately from Harny DSH payments.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, verif-hash",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const plans = {
  monthly: { id: "monthly", name: "Monthly", amount: 5, currency: "USD", durationDays: 30 },
  lifetime: { id: "lifetime", name: "Lifetime", amount: 20, currency: "USD", durationDays: null },
};
const clientUrl = "https://repo2apky.netlify.app";

function safeEqual(a: string | null, b: string | null) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
function redirectPayment(ok: boolean) {
  return Response.redirect(clientUrl + "/?payment=" + (ok ? "success" : "failed"), 303);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  const webhookHash = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "POST" ? "": "");

  if (action === "callback" && req.method === "GET") {
    const txRef = url.searchParams.get("tx_ref") || "";
    const transactionId = url.searchParams.get("transaction_id") || "";
    if (!txRef || !transactionId) return redirectPayment(false);
    try {
      await verifyAndApply(admin, flutterwaveKey, txRef, transactionId);
      return redirectPayment(true);
    } catch (e) {
      console.error("Repo2APK payment callback verification failed:", e instanceof Error ? e.message : "unknown");
      return redirectPayment(false);
    }
  }

  if (action === "webhook" && req.method === "POST") {
    if (!safeEqual(req.headers.get("verif-hash"), webhookHash || null)) return new Response("Unauthorized", { status: 401 });
    const event = await req.json().catch(() => ({}));
    const data = event?.data;
    if (event?.event === "charge.completed" && data?.id && data?.tx_ref) {
      try { await verifyAndApply(admin, flutterwaveKey, String(data.tx_ref), String(data.id)); }
      catch (e) { console.error("Repo2APK webhook verification failed:", e instanceof Error ? e.message : "unknown"); }
    }
    return new Response("OK", { status: 200 });
  }

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    body = await req.json().catch(() => ({}));
  }
  const requestAction = String(body.action || action || "config");

  if (requestAction === "config") return json({ plans: Object.values(plans) });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to continue." }, 401);
  const token = authHeader.slice(7);
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Session is invalid or expired." }, 401);
  const user = userData.user;

  if (requestAction === "entitlement") {
    const { data, error } = await admin.from("repo2apk_entitlements")
      .select("lifetime,active_until").eq("user_id", user.id).maybeSingle();
    if (error) return json({ error: "Could not load your plan." }, 500);
    const lifetime = data?.lifetime === true;
    const expiresAt = data?.active_until || null;
    const active = lifetime || (!!expiresAt && new Date(expiresAt).getTime() > Date.now());
    return json({ entitlement: { active, plan: lifetime ? "lifetime" : active ? "monthly" : null, lifetime, expiresAt } });
  }

  if (requestAction === "checkout") {
    if (!flutterwaveKey) return json({ error: "Flutterwave is not configured." }, 503);
    const plan = plans[String(body.plan || "") as keyof typeof plans];
    if (!plan) return json({ error: "Choose monthly or lifetime plan." }, 400);
    const { data: current } = await admin.from("repo2apk_entitlements")
      .select("lifetime,active_until").eq("user_id", user.id).maybeSingle();
    if (current?.lifetime) return json({ error: "Lifetime access is already active." }, 409);

    const txRef = "repo2apk_" + crypto.randomUUID();
    const { error: orderError } = await admin.from("repo2apk_payment_orders").insert({
      tx_ref: txRef, user_id: user.id, plan: plan.id, amount: plan.amount,
      currency: plan.currency, status: "pending",
    });
    if (orderError) return json({ error: "Could not create payment record." }, 500);

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: "Bearer " + flutterwaveKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        tx_ref: txRef, amount: String(plan.amount), currency: plan.currency,
        redirect_url: supabaseUrl + "/functions/v1/repo2apk-payments?action=callback",
        customer: { email: user.email },
        customizations: { title: "Repo2APK", description: plan.name + " plan" },
        meta: { userId: user.id, product: "repo2apk", plan: plan.id },
        configurations: { session_duration: 20, max_retry_attempt: 3 },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.status !== "success" || !result.data?.link) {
      await admin.from("repo2apk_payment_orders").update({ status: "failed" }).eq("tx_ref", txRef);
      return json({ error: "Could not start Flutterwave checkout." }, 502);
    }
    return json({ txRef, checkoutUrl: result.data.link });
  }

  return json({ error: "Unknown action." }, 400);
});

async function verifyAndApply(admin: ReturnType<typeof createClient>, key: string | undefined, txRef: string, transactionId: string) {
  if (!key) throw new Error("Flutterwave is not configured");
  const { data: order, error: orderError } = await admin.from("repo2apk_payment_orders")
    .select("tx_ref,user_id,plan,amount,currency,status")
    .eq("tx_ref", txRef).maybeSingle();
  if (orderError || !order) throw new Error("Payment reference not found");
  if (order.status === "paid") return;

  const verifyUrl = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`;
  const response = await fetch(verifyUrl, {
    headers: {
      Authorization: "Bearer " + key,
      Accept: "application/json"
    }
  });
  const result = await response.json().catch(() => ({}));
  const tx = result.data;
  if (!response.ok || result.status !== "success" || !tx ||
      String(tx.tx_ref) !== txRef || tx.status !== "successful" ||
      tx.currency !== order.currency || Number(tx.amount) < Number(order.amount)) {
    throw new Error("Flutterwave transaction did not match the expected payment");
  }
  const { error } = await admin.rpc("repo2apk_apply_payment", {
    p_tx_ref: txRef, p_transaction_id: String(tx.id), p_verified_amount: Number(tx.amount),
  });
  if (error) throw new Error("Could not activate the verified plan");
}
