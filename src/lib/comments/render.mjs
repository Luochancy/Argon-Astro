// Render static baked comments using upstream Argon's exact DOM structure
// (.comment-item-left-wrapper + .comment-item-avatar + .comment-upvote below avatar).
import { renderUserAgent } from "./ua.mjs";
import { replaceStickers } from "./emotions.mjs";
import { qqAvatarUrl } from "./identity.mjs";
import { gravatarUrl } from "./gravatar-url.mjs";

function esc(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function markdown(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

const DEFAULT_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#5e72e4"/><circle cx="20" cy="15" r="7" fill="#fff" opacity="0.9"/><path d="M8 35c2-7 8-10 12-10s10 3 12 10" fill="#fff" opacity="0.9"/></svg>'
  );

export function renderCommentItem(comment) {
  const id = Number(comment.id) || 0;
  const privateComment = Boolean(comment.private);
  const plain = privateComment ? "" : (comment.markdown ? markdown(comment.content) : esc(comment.content));
  const body = privateComment ? "" : replaceStickers(plain);
  const badges = [
    comment.parentAuthor ? '<span class="comment-parent-info">@' + esc(comment.parentAuthor) + "</span>" : "",
    comment.pinned ? '<span class="badge badge-danger badge-pinned">置顶</span>' : "",
    privateComment ? '<span class="badge badge-success badge-private-comment">悄悄话</span>' : "",
    renderUserAgent(comment.userAgent),
  ].join("");
  const folded = comment.fold && !privateComment && String(comment.content || "").length > 180 ? " comment-folded" : "";
  const avatar = qqAvatarUrl(comment.qq) || gravatarUrl("https://www.gravatar.com/avatar", comment.gravatar) || DEFAULT_AVATAR;
  const avatarHtml = '<div class="comment-item-avatar"><img class="avatar photo" src="' + avatar + '" alt="" width="40" height="40"></div>';
  const upvoteHtml =
    '<button class="comment-upvote btn btn-icon btn-outline-primary btn-sm" type="button" data-id="' + id + '">'
    + '<span class="btn-inner--icon"><i class="fa fa-caret-up"></i></span>'
    + '<span class="btn-inner--text"><span class="comment-upvote-num">' + Number(comment.upvotes || 0) + "</span></span>"
    + "</button>";
  return '<li class="comment-item" id="comment-' + id + '" data-id="' + id + '">'
    + '<div class="comment-item-left-wrapper">' + avatarHtml + upvoteHtml + "</div>"
    + '<div class="comment-item-inner' + folded + '" id="comment-inner-' + id + '">'
    + '<div class="comment-item-title"><div class="comment-name"><div class="comment-author">' + esc(comment.author) + "</div>" + badges + "</div></div>"
    + '<div class="comment-item-text">' + body + "</div>"
    + "</div></li>";
}

export function renderCommentList(comments) {
  if (!comments || !comments.length) return "";
  return '<ol class="comment-list">' + comments.map(renderCommentItem).join("") + "</ol>";
}
