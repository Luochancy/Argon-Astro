import { issueCaptcha, verifyCaptcha } from "./captcha.mjs";

const QQ_PATTERN = /^[1-9][0-9]{4,10}$/;

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

const WORKER_USER_AGENT = "Argon-Astro-Worker/1.0";

function authHeader(env) {
  return "Basic " + Buffer.from(env.WP_USER + ":" + env.WP_APP_PASSWORD).toString("base64");
}

function isValidContact(contact) {
  return contact.includes("@") || QQ_PATTERN.test(contact);
}

export async function handleComments(request, env, fetchImpl = fetch) {
  if (!sameOrigin(request)) return json(403, { error: "跨站请求被拒绝。" });
  if (!env.WP_URL || !env.WP_USER || !env.WP_APP_PASSWORD) {
    return json(503, { error: "评论服务未配置。" });
  }
  const url = new URL(request.url);
  const endpoint = env.WP_URL.replace(/\/$/, "") + "/wp-json/argon-astro/v1/comments";
  if (request.method === "GET" && url.searchParams.get("captcha") === "1") {
    if (!env.ARGON_CAPTCHA_SECRET) return json(503, { error: "验证码未配置。" });
    const issued = issueCaptcha(env.ARGON_CAPTCHA_SECRET);
    return json(200, { question: issued.question, token: issued.token });
  }
  if (request.method === "GET") {
    const post = url.searchParams.get("post");
    if (!post || !/^[0-9]+$/.test(post)) return json(400, { error: "文章编号无效。" });
    const response = await fetchImpl(endpoint + "?post=" + post, {
      headers: { authorization: authHeader(env), accept: "application/json", "user-agent": WORKER_USER_AGENT },
    });
    if (!response.ok) return json(502, { error: "评论暂时不可用。" });
    const items = await response.json();
    return json(200, items.map((item) => ({
      id: item.id,
      parent: item.parent,
      author: item.author,
      date: item.date,
      content: item.private ? "" : item.content,
      url: item.url || "",
      parentAuthor: String(item.parentAuthor || ""),
      pinned: Boolean(item.pinned),
      private: Boolean(item.private),
      markdown: Boolean(item.markdown),
      upvotes: Number(item.upvotes || 0),
      userAgent: String(item.userAgent || ""),
      qq: QQ_PATTERN.test(String(item.qq || "")) ? String(item.qq) : "",
      gravatar: /^[a-f0-9]{32}$/.test(String(item.gravatar || "")) ? String(item.gravatar) : "",
    })));
  }
  if (request.method !== "POST") return json(405, { error: "方法不被允许。" });
  const body = await request.json();
  if (body.action === "edit") return editComment(body, env, fetchImpl);
  if (body.action === "pin") return pinComment(body, env, fetchImpl);
  const content = String(body.content || "").trim();
  const author = String(body.author || "").trim();
  const email = String(body.email || "").trim();
  const postId = Number(body.postId);
  if (!Number.isInteger(postId) || postId < 1 || author.length < 1 || author.length > 40 || content.length < 1 || content.length > 2000 || !isValidContact(email)) {
    return json(400, { error: "评论内容无效。" });
  }
  const requireCaptcha = env.ARGON_CAPTCHA === "true"
    || (Boolean(env.ARGON_CAPTCHA_SECRET) && env.ARGON_CAPTCHA !== "false");
  if (requireCaptcha && !verifyCaptcha(env.ARGON_CAPTCHA_SECRET || "", body.captchaToken, body.captchaAnswer)) {
    return json(400, { error: "验证码不正确。" });
  }
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: authHeader(env),
      "content-type": "application/json",
      "user-agent": WORKER_USER_AGENT,
    },
    body: JSON.stringify({
      postId,
      author,
      email,
      url: String(body.url || ""),
      content,
      parent: Number(body.parent || 0),
      mailNotice: Boolean(body.mailNotice),
      markdown: Boolean(body.markdown),
      private: Boolean(body.private),
    }),
  });
  if (!response.ok) {
    let upstream = null;
    try {
      upstream = await response.json();
    } catch {
      upstream = null;
    }
    const code = upstream && typeof upstream.code === "string" ? upstream.code : "";
    if (response.status === 409 || code === "comment_duplicate") {
      return json(409, { error: "检测到重复评论，请勿重复提交。" });
    }
    if (response.status === 429 || code === "comment_flood") {
      return json(429, { error: "评论提交过于频繁，请稍后再试。" });
    }
    if (response.status === 400) {
      return json(400, { error: "评论内容无效或不符合要求。" });
    }
    return json(502, { error: "评论暂时不可用。" });
  }
  return json(201, await response.json());
}

async function editComment(body, env, fetchImpl) {
  const id = Number(body.id);
  const email = String(body.email || "").trim();
  const content = String(body.content || "").trim();
  if (!Number.isInteger(id) || id < 1 || content.length < 1 || content.length > 2000 || !isValidContact(email)) {
    return json(400, { error: "评论内容无效。" });
  }
  const endpoint = env.WP_URL.replace(/\/$/, "") + "/wp-json/argon-astro/v1/comments/edit";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: authHeader(env),
      "content-type": "application/json",
    },
    body: JSON.stringify({ id, email, content }),
  });
  if (response.status === 403) return json(403, { error: "只能修改自己的评论。" });
  if (!response.ok) return json(502, { error: "评论暂时不可用。" });
  const result = await response.json();
  return json(200, { id: result.id, content: result.content });
}

async function pinComment(body, env, fetchImpl) {
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return json(400, { error: "评论编号无效。" });
  }
  const endpoint = env.WP_URL.replace(/\/$/, "") + "/wp-json/argon-astro/v1/comments/pin";
  const payload = { id };
  if (typeof body.pinned === "boolean") {
    payload.pinned = body.pinned;
  }
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: authHeader(env),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 404) return json(404, { error: "评论不存在。" });
  if (!response.ok) return json(502, { error: "评论暂时不可用。" });
  const result = await response.json();
  return json(200, { id: result.id, pinned: Boolean(result.pinned) });
}
