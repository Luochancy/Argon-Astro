import { handleComments } from "../../src/lib/comments/handler.mjs";

export default async function handler(request) {
  return handleComments(request, process.env);
}
