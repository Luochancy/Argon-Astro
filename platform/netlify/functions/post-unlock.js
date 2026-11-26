import { handlePostUnlock } from "../../../src/lib/wordpress/post-unlock.mjs";

export async function handler(event) {
  const method = (event.httpMethod || "POST").toUpperCase();
  const request = new Request(event.rawUrl, {
    method,
    headers: event.headers,
    body: method === "GET" || method === "HEAD" ? undefined : event.body,
  });
  const response = await handlePostUnlock(request, process.env);
  return {
    statusCode: response.status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: await response.text(),
  };
}
