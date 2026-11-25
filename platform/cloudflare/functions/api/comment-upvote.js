import { handleCommentUpvote } from "../../../src/lib/comments/upvote.mjs";

export async function onRequest(context) {
  return handleCommentUpvote(context.request, context.env);
}
