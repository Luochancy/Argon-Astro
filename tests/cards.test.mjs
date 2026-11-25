import assert from "node:assert/strict";
import { fillGithubCard, renderGithubCard } from "../src/lib/github-card.mjs";
import { renderWidgets } from "../src/lib/widgets.mjs";
import { renderCommentList } from "../src/lib/comments/render.mjs";

const card = await fillGithubCard({ author: "solstice23", project: "argon-theme" }, async (url) => {
  assert.equal(url, "https://api.github.com/repos/solstice23/argon-theme");
  return new Response(JSON.stringify({ description: "light theme", stargazers_count: 12, forks_count: 3 }));
});
assert.match(card, /github-info-card-name/);
assert.match(card, /github-info-card-stars">12/);
assert.equal(card.includes("admin-ajax.php"), false);
assert.match(renderGithubCard({ author: "a", project: "b" }), /a\/b/);
assert.match(renderWidgets([{ type: "links", title: "工具", items: [{ label: "归档", href: "/archives/" }] }]), /href="\/archives\/"/);
assert.match(renderCommentList([{ id: 4, author: "读者", content: "早安", upvotes: 2 }]), /comment-item/);
assert.match(renderCommentList([{ id: 4, author: "读者", content: "早安", upvotes: 2 }]), /comment-upvote-num">2/);
console.log("cards ok");
