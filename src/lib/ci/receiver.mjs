import { acceptDeploy } from "./accept.mjs";

function parseReason(body) {
  try {
    const parsed = JSON.parse(body || "{}");
    if (parsed && typeof parsed.reason === "string" && parsed.reason.trim()) {
      return parsed.reason.trim();
    }
  } catch {
    // Fall back to default reason when body is not JSON.
  }
  return "theme-config";
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleDeployHook(request, env, seen = new Set(), now = Date.now() / 1000, fetchImpl = fetch) {
  const body = await request.text();
  const result = acceptDeploy({
    timestamp: request.headers.get("x-argon-timestamp") || "",
    nonce: request.headers.get("x-argon-nonce") || "",
    body,
    signature: request.headers.get("x-argon-signature") || "",
  }, env.ARGON_DEPLOY_SECRET || "", now, seen);

  if (!result.ok) {
    return jsonResponse(result.status, { ok: false, error: result.error || "" });
  }

  const reason = parseReason(body);
  if (env.DEPLOY_HOOK_URL) {
    const upstream = await fetchImpl(env.DEPLOY_HOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!upstream.ok) {
      return jsonResponse(502, { ok: false, error: "下游部署触发失败。" });
    }
    return jsonResponse(202, { ok: true, error: "", dispatched: true });
  }

  if (env.GITHUB_REPO && env.GITHUB_TOKEN) {
    const repo = String(env.GITHUB_REPO).replace(/^\/+|\/+$/g, "");
    const upstream = await fetchImpl("https://api.github.com/repos/" + repo + "/dispatches", {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.GITHUB_TOKEN,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "argon-astro-receiver",
      },
      body: JSON.stringify({
        event_type: "argon-config",
        client_payload: { reason },
      }),
    });
    if (!upstream.ok) {
      return jsonResponse(502, { ok: false, error: "下游部署触发失败。" });
    }
    return jsonResponse(202, { ok: true, error: "", dispatched: true });
  }

  return jsonResponse(result.status, { ok: true, error: "", dispatched: false });
}
