import { handleViews } from "../../../src/lib/wordpress/views.mjs";

export async function onRequest(context) {
  return handleViews(context.request, context.env);
}
