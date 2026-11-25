import { handleDeployHook } from "../../../src/lib/ci/receiver.mjs";

const seen = new Set();

export async function onRequest(context) {
  return handleDeployHook(context.request, context.env, seen);
}
