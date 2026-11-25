import { handleCommentUpvote } from "../../src/lib/comments/upvote.mjs";

export default async function handler(request) {
  return handleCommentUpvote(request, process.env);
}
