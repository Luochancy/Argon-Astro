import { handleBingWallpaper } from "../../../src/lib/edge/public-proxies.mjs";

export async function handler(event) {
  const request = new Request(event.rawUrl, { method: event.httpMethod || "GET", headers: event.headers });
  const response = await handleBingWallpaper(request);
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    return { statusCode: response.status, headers: { location } };
  }
  const buf = Buffer.from(await response.arrayBuffer());
  return {
    statusCode: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "image/jpeg",
      "cache-control": response.headers.get("cache-control") || "public, max-age=3600",
    },
    isBase64Encoded: true,
    body: buf.toString("base64"),
  };
}
