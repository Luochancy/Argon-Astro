import { handleUpvote } from "../../../src/lib/shuoshuo/upvote.mjs";

export async function onRequest(context) {
  return handleUpvote(context.request, context.env);
}
