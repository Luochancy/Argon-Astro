import { handleUpvote } from "../../src/lib/shuoshuo/upvote.mjs";

export default async function handler(request) {
  return handleUpvote(request, process.env);
}
