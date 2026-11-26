import { handleGithubRepo } from "../../../src/lib/edge/public-proxies.mjs";

export async function onRequest(context) {
  return handleGithubRepo(context.request);
}
