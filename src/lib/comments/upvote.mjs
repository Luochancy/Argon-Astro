function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
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

export async function handleCommentUpvote(request, env, fetchImpl = fetch) {
  if (!sameOrigin(request)) return json(403, { error: "跨站请求被拒绝。" });
  if (!env.WP_URL || !env.WP_USER || !env.WP_APP_PASSWORD) return json(503, { error: "点赞服务未配置。" });
  if (request.method !== "POST") return json(405, { error: "方法不被允许。" });
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "请求格式无效。" });
  }
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return json(400, { error: "评论编号无效。" });
  const endpoint = env.WP_URL.replace(/\/$/, "") + "/wp-json/argon-astro/v1/comment-upvote";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(env.WP_USER + ":" + env.WP_APP_PASSWORD).toString("base64"),
      "content-type": "application/json",
      "user-agent": "Argon-Astro-Worker/1.0",
    },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) return json(502, { error: "点赞暂时不可用。" });
  const result = await response.json();
  return json(200, { total: result.total });
}
