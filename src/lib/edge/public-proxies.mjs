// Shared edge proxies for /api/github and /api/bing used across Cloudflare Workers, Pages, Vercel, and Netlify.

const WORKER_USER_AGENT = "Argon-Astro-Worker/1.0";

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

export async function handleGithubRepo(request, fetchImpl = fetch) {
  if (request.method !== "GET") return json(405, { error: "Method Not Allowed" });
  const url = new URL(request.url);
  const author = String(url.searchParams.get("author") || "").trim();
  const project = String(url.searchParams.get("project") || "").trim();
  if (!/^[a-zA-Z0-9._-]+$/.test(author) || !/^[a-zA-Z0-9._-]+$/.test(project)) {
    return json(400, { error: "Invalid repository" });
  }
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${author}/${project}`, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": WORKER_USER_AGENT,
      },
      cf: { cacheTtl: 21600, cacheEverything: true },
    });
    if (!res.ok) return json(502, { error: "GitHub API unavailable" });
    const data = await res.json();
    return json(
      200,
      {
        description: String(data?.description || ""),
        stars: Number(data?.stargazers_count ?? 0),
        forks: Number(data?.forks_count ?? 0),
      },
      { "cache-control": "public, max-age=3600, s-maxage=21600" },
    );
  } catch {
    return json(502, { error: "GitHub API unavailable" });
  }
}

export async function handleBingWallpaper(request, fetchImpl = fetch) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const apiRes = await fetchImpl("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", {
      headers: { accept: "application/json", "user-agent": WORKER_USER_AGENT },
      cf: { cacheTtl: 21600, cacheEverything: true },
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      const rel = data && Array.isArray(data.images) && data.images[0] ? data.images[0].url : "";
      if (typeof rel === "string" && rel.startsWith("/")) {
        const target = "https://www.bing.com" + rel;
        const imgRes = await fetchImpl(target, {
          headers: { "user-agent": WORKER_USER_AGENT },
          cf: { cacheTtl: 21600, cacheEverything: true },
        });
        if (imgRes.ok) {
          const headers = new Headers(imgRes.headers);
          headers.set("cache-control", "public, max-age=3600, s-maxage=21600");
          return new Response(method === "HEAD" ? null : imgRes.body, { status: 200, headers });
        }
        return new Response(null, {
          status: 302,
          headers: { location: target, "cache-control": "public, max-age=3600" },
        });
      }
    }
  } catch {
    // Fall through to 502 so CSS gradient placeholder stays visible.
  }
  return new Response("Bing wallpaper unavailable.", { status: 502 });
}
