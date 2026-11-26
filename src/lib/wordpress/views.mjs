// Private Edge Worker proxy for WordPress post view counts without exposing WP_URL.

const WORKER_USER_AGENT = "Argon-Astro-Worker/1.0";

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function handleViews(request, env, fetchImpl = fetch) {
  if (!env.WP_URL || !env.WP_USER || !env.WP_APP_PASSWORD) {
    return json(503, { error: "阅读量服务未配置。" });
  }
  const auth = "Basic " + Buffer.from(env.WP_USER + ":" + env.WP_APP_PASSWORD).toString("base64");
  const base = env.WP_URL.replace(/\/$/, "") + "/wp-json/argon-astro/v1/views";

  if (request.method === "GET") {
    const search = new URL(request.url).searchParams;
    const idsRaw = search.get("ids");
    if (idsRaw) {
      const ids = idsRaw.split(",").map((v) => v.trim()).filter((v) => /^[0-9]+$/.test(v)).slice(0, 50);
      if (!ids.length) return json(400, { error: "文章编号无效。" });
      const response = await fetchImpl(base + "?ids=" + ids.join(","), {
        headers: { authorization: auth, accept: "application/json", "user-agent": WORKER_USER_AGENT },
      });
      if (!response.ok) return json(502, { error: "阅读量暂时不可用。" });
      const data = await response.json();
      const map = {};
      if (data && typeof data.views === "object" && data.views !== null) {
        for (const [k, v] of Object.entries(data.views)) {
          if (/^[0-9]+$/.test(k)) map[k] = Math.max(0, Number(v || 0));
        }
      }
      return json(200, { views: map });
    }
    const id = search.get("id");
    if (!id || !/^[0-9]+$/.test(id)) return json(400, { error: "文章编号无效。" });
    const response = await fetchImpl(base + "?id=" + id, {
      headers: { authorization: auth, accept: "application/json", "user-agent": WORKER_USER_AGENT },
    });
    if (!response.ok) return json(502, { error: "阅读量暂时不可用。" });
    const data = await response.json();
    return json(200, { id: Number(data.id || id), views: Math.max(0, Number(data.views || 0)) });
  }

  if (request.method !== "POST") return json(405, { error: "方法不被允许。" });
  if (!sameOrigin(request)) return json(403, { error: "跨站请求被拒绝。" });

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "请求格式无效。" });
  }
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return json(400, { error: "文章编号无效。" });

  const response = await fetchImpl(base, {
    method: "POST",
    headers: {
      authorization: auth,
      "content-type": "application/json",
      "user-agent": WORKER_USER_AGENT,
    },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) return json(502, { error: "阅读量暂时不可用。" });
  const data = await response.json();
  return json(200, { id: Number(data.id || id), views: Math.max(0, Number(data.views || 0)) });
}
