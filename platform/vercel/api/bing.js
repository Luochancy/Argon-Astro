import { handleBingWallpaper } from "../../src/lib/edge/public-proxies.mjs";

export default async function handler(request) {
  return handleBingWallpaper(request);
}
