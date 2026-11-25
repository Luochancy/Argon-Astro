import { shouldFoldComment } from "../lib/comments/fold.mjs";

const SHUOSHUO_FOLD_HEIGHT = 400;

function expandLabel(): string {
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "Show" : "展开";
}

/** Fold long comment bodies using upstream .comment-item-inner.comment-folded markup. */
export function foldLongComments(signal?: AbortSignal): void {
  const candidates = document.querySelectorAll<HTMLElement>(".comment-item-inner, .comment-item");
  const label = expandLabel();

  candidates.forEach((node) => {
    // Avoid double-binding when a .comment-item wraps a .comment-item-inner.
    if (node.classList.contains("comment-item") && node.querySelector(".comment-item-inner")) return;
    if (node.dataset.foldBound === "true" || node.classList.contains("comment-unfolded")) return;
    if (!shouldFoldComment(node.scrollHeight || node.clientHeight)) return;

    node.dataset.foldBound = "true";
    node.classList.add("comment-folded");

    const more = document.createElement("div");
    more.className = "show-full-comment";
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<i class="fa fa-angle-down" aria-hidden="true"></i> ${label}`;
    more.appendChild(button);
    node.appendChild(more);

    more.addEventListener(
      "click",
      () => {
        node.classList.remove("comment-folded");
        node.classList.add("comment-unfolded");
      },
      { signal },
    );
  });
}

/** Fold long shuoshuo posts using upstream .shuoshuo-content.shuoshuo-folded markup. */
export function foldLongShuoshuo(signal?: AbortSignal): void {
  const label = expandLabel();
  document.querySelectorAll<HTMLElement>(".shuoshuo-foldable > .shuoshuo-content").forEach((content) => {
    if (content.dataset.foldBound === "true" || content.classList.contains("shuoshuo-unfolded")) return;
    if ((content.clientHeight || content.scrollHeight) <= SHUOSHUO_FOLD_HEIGHT) return;

    content.dataset.foldBound = "true";
    content.classList.add("shuoshuo-folded");

    const more = document.createElement("div");
    more.className = "show-full-shuoshuo";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline-primary btn-sm";
    button.innerHTML = `<i class="fa fa-angle-down" aria-hidden="true"></i> ${label}`;
    more.appendChild(button);
    content.appendChild(more);

    more.addEventListener(
      "click",
      () => {
        content.classList.remove("shuoshuo-folded");
        content.classList.add("shuoshuo-unfolded");
      },
      { signal },
    );
  });
}

export function bindFold(foldComments: boolean, foldShuoshuo = false, signal?: AbortSignal): void {
  if (foldComments) foldLongComments(signal);
  if (foldShuoshuo) foldLongShuoshuo(signal);
}
