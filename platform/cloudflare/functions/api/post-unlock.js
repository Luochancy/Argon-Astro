import { handlePostUnlock } from "../../../src/lib/wordpress/post-unlock.mjs";

export async function onRequest(context) {
  return handlePostUnlock(context.request, context.env);
}
