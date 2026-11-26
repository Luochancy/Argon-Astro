import { handleViews } from "../../src/lib/wordpress/views.mjs";

export default async function handler(request) {
  return handleViews(request, process.env);
}
