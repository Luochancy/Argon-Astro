import assert from "node:assert/strict";
import { parseUserAgent, renderUserAgent } from "../src/lib/comments/ua.mjs";
import { issueCaptcha, verifyCaptcha } from "../src/lib/comments/captcha.mjs";
import { shouldFoldComment } from "../src/lib/comments/fold.mjs";

const parsed = parseUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
assert.equal(parsed.platform, "Windows");
assert.equal(parsed.browser, "Chrome");
assert.match(renderUserAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0"), /comment-useragent/);
const issued = issueCaptcha("secret", 1_000_000);
const answer = Number(issued.question.split("+")[0]) + Number(issued.question.split("+")[1]);
assert.equal(verifyCaptcha("secret", issued.token, answer + 1, 1_000_000), false);
assert.equal(verifyCaptcha("secret", issued.token, answer, 1_000_000), true);
assert.equal(verifyCaptcha("secret", issued.token, answer, issued.expires + 1), false);
assert.equal(shouldFoldComment(800), false);
assert.equal(shouldFoldComment(801), true);
console.log("comment extra ok");
