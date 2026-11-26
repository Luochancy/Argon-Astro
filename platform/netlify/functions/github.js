import { handleGithubRepo } from "../../../src/lib/edge/public-proxies.mjs";

export async function handler(event) {
  const request = new Request(event.rawUrl, { method: event.httpMethod || "GET", headers: event.headers });
  const response = await handleGithubRepo(request);
  return {
    statusCode: response.status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: await response.text(),
  };
}
