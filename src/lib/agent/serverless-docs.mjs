// Runtime Serverless injection / override for /robots.txt, /llms.txt, and /llms-full.txt.
// Lets deployments inject or override these files via Serverless environment variables
// (e.g. Cloudflare Workers Variables/Secrets) without rebuilding static assets.

const ENV_MAP = {
  "/robots.txt": "ARGON_ROBOTS_TXT",
  "/llms.txt": "ARGON_LLMS_TXT",
  "/llms-full.txt": "ARGON_LLMS_FULL_TXT",
};

/** Return raw text injected via Serverless env for the given pathname, or null if unset. */
export function getServerlessDocText(pathname, env) {
  const key = ENV_MAP[pathname];
  if (!key || !env) return null;
  const raw = env[key];
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  return trimmed ? trimmed + "\n" : null;
}

/** Build a UTF-8 inline plain-text response for an env-injected robots/llms document. */
export function buildServerlessDocResponse(text, method = "GET", contentType = "text/plain; charset=utf-8") {
  return new Response(method === "HEAD" ? null : text, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
      vary: "Accept",
    },
  });
}
