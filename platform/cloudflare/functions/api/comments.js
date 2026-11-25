import { handleComments } from "../../../src/lib/comments/handler.mjs";

export async function onRequest(context) {
  return handleComments(context.request, context.env);
}
