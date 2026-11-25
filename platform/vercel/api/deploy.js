import { handleDeployHook } from "../../src/lib/ci/receiver.mjs";

const seen = new Set();

export default async function handler(request) {
  return handleDeployHook(request, process.env, seen);
}
