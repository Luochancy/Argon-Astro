import { handleBingWallpaper } from "../../../src/lib/edge/public-proxies.mjs";

export async function onRequest(context) {
  return handleBingWallpaper(context.request);
}
