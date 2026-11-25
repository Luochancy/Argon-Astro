import { handleComments } from "../../../src/lib/comments/handler.mjs";

export async function handler(event) {
  const method = (event.httpMethod || "GET").toUpperCase();
  const request = new Request(event.rawUrl, {
    method,
    headers: event.headers,
    body: method === "GET" || method === "HEAD" ? undefined : event.body,
  });
  const response = await handleComments(request, process.env);
  return {
    statusCode: response.status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: await response.text(),
  };
}
