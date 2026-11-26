import { handlePostUnlock } from "../../src/lib/wordpress/post-unlock.mjs";

export default async function handler(request) {
  return handlePostUnlock(request, process.env);
}
