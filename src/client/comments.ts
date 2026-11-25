import { insertEmotion } from "../lib/comments/emotions.mjs";
import { pageComments, qqAvatarUrl } from "../lib/comments/identity.mjs";
import { gravatarUrl } from "../lib/comments/gravatar-url.mjs";
import { foldLongComments } from "./fold";
import type { ClientConfig } from "./types";

interface LiveComment {
  id: number;
  author: string;
  content: string;
  date: string;
  qq?: string;
  gravatar?: string;
  parentAuthor?: string;
  upvotes?: number;
}

/** Bind headless WordPress live comments using upstream Argon layout (avatar + upvote left wrapper). */
export function bindComments(
  options: ClientConfig["comments"],
  signal?: AbortSignal,
  foldLong = false,
): void {
  const endpoint = options.endpoint;
  const form = document.getElementById("argon-comment-form") as HTMLFormElement | null;
  const list = document.getElementById("argon-comment-list");
  const postId = Number(form?.dataset.postId || list?.dataset.postId || 0);
  if (!postId) return;
  if (form?.dataset.bound === "true") return;
  if (form) form.dataset.bound = "true";

  const status = document.getElementById("argon-comment-status");
  const question = document.getElementById("argon-captcha-question");
  const refreshCaptcha = async () => {
    if (!question || options.captchaAjax === false) return;
    const challenge = await fetch(endpoint + "?captcha=1", { headers: { accept: "application/json" } });
    if (!challenge.ok) return;
    const data = (await challenge.json()) as { question?: string; token?: string };
    question.textContent = data.question || "";
    const token = form?.querySelector<HTMLInputElement>("[name=captchaToken]");
    if (token && data.token) token.value = data.token;
  };
  void refreshCaptcha().catch(() => undefined);

  let allItems: LiveComment[] = [];
  let currentPage = 1;
  const pageSize = 10;

  const renderPage = () => {
    if (!list) return;
    const page = pageComments(allItems, currentPage, pageSize);
    const visible =
      options.paginationType === "feed" ? allItems.slice(0, currentPage * pageSize) : page.items;
    list.replaceChildren();

    const ol = document.createElement("ol");
    ol.className = "comment-list";

    for (const item of visible) {
      const row = document.createElement("li");
      row.className = "comment-item";
      row.id = `comment-${item.id}`;
      row.dataset.id = String(item.id);

      // Left column: avatar stacked above the upvote pill so upvote never overlaps comment text.
      const leftWrapper = document.createElement("div");
      leftWrapper.className = "comment-item-left-wrapper";

      const avatarWrap = document.createElement("div");
      avatarWrap.className = "comment-item-avatar";
      const avatarSrc =
        (options.enableQqAvatar !== false ? qqAvatarUrl(item.qq || "") : "") ||
        gravatarUrl(options.gravatarCdn || "https://www.gravatar.com/avatar", item.gravatar || "");
      if (avatarSrc) {
        const image = document.createElement("img");
        image.className = "avatar photo";
        image.src = avatarSrc;
        image.width = 40;
        image.height = 40;
        image.alt = item.author;
        avatarWrap.appendChild(image);
      }
      leftWrapper.appendChild(avatarWrap);

      if (options.enableUpvote !== false) {
        const vote = document.createElement("button");
        vote.type = "button";
        vote.className = "comment-upvote btn btn-icon btn-outline-primary btn-sm";
        vote.dataset.id = String(item.id);
        vote.innerHTML =
          '<span class="btn-inner--icon"><i class="fa fa-caret-up" aria-hidden="true"></i></span>' +
          `<span class="btn-inner--text"><span class="comment-upvote-num">${Number(item.upvotes || 0)}</span></span>`;
        vote.addEventListener(
          "click",
          async () => {
            if (vote.classList.contains("upvoted") || vote.classList.contains("comment-upvoting")) return;
            vote.classList.add("comment-upvoting");
            try {
              const result = await fetch("/api/comment-upvote", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id: item.id }),
              });
              if (!result.ok) return;
              const data = (await result.json()) as { total?: number };
              const numEl = vote.querySelector(".comment-upvote-num");
              if (numEl && typeof data.total === "number") numEl.textContent = String(data.total);
              vote.classList.add("upvoted");
            } finally {
              vote.classList.remove("comment-upvoting");
            }
          },
          { signal },
        );
        leftWrapper.appendChild(vote);
      }

      // Right column: author header, timestamp, comment body, and edit operations.
      const inner = document.createElement("div");
      inner.className = "comment-item-inner";
      inner.id = `comment-inner-${item.id}`;

      const titleRow = document.createElement("div");
      titleRow.className = "comment-item-title";

      const nameWrap = document.createElement("div");
      nameWrap.className = "comment-name";

      const authorEl = document.createElement("div");
      authorEl.className = "comment-author";
      authorEl.textContent = item.author;
      nameWrap.appendChild(authorEl);

      if (options.showParentInfo !== false && item.parentAuthor) {
        const parent = document.createElement("span");
        parent.className = "comment-parent-info";
        parent.textContent = `@${item.parentAuthor}`;
        nameWrap.appendChild(parent);
      }

      const infoWrap = document.createElement("div");
      infoWrap.className = "comment-info";
      if (item.date) {
        const timeEl = document.createElement("div");
        timeEl.className = "comment-time";
        timeEl.textContent = item.date;
        infoWrap.appendChild(timeEl);
      }

      titleRow.append(nameWrap, infoWrap);

      const body = document.createElement("div");
      body.className = "comment-item-text";
      body.textContent = item.content;

      inner.append(titleRow, body);

      if (options.allowEdit) {
        const ops = document.createElement("div");
        ops.className = "comment-operations";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "comment-edit btn btn-sm btn-outline-primary";
        edit.dataset.id = String(item.id);
        edit.textContent = "编辑";
        edit.addEventListener(
          "click",
          async () => {
            const email = window.prompt("邮箱");
            const next = window.prompt("新内容", body.textContent || "");
            if (!email || !next) return;
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "edit", id: item.id, email, content: next }),
            });
            if (response.ok) body.textContent = next;
          },
          { signal },
        );
        ops.appendChild(edit);
        inner.appendChild(ops);
      }

      row.append(leftWrapper, inner);
      ol.appendChild(row);
    }

    list.appendChild(ol);

    if (page.pages > 1) {
      const nav = document.createElement("div");
      nav.className = "comment-pagination mt-3";
      if (options.paginationType === "feed") {
        if (currentPage < page.pages) {
          const more = document.createElement("button");
          more.type = "button";
          more.className = "btn btn-sm btn-outline-primary";
          more.textContent = "加载更多";
          more.addEventListener(
            "click",
            () => {
              currentPage += 1;
              renderPage();
            },
            { signal },
          );
          nav.append(more);
        }
      } else {
        const prev = document.createElement("button");
        prev.type = "button";
        prev.className = "btn btn-sm btn-outline-primary mr-2";
        prev.textContent = "上一页";
        prev.disabled = currentPage <= 1;
        prev.addEventListener(
          "click",
          () => {
            currentPage = Math.max(1, currentPage - 1);
            renderPage();
          },
          { signal },
        );
        const next = document.createElement("button");
        next.type = "button";
        next.className = "btn btn-sm btn-outline-primary";
        next.textContent = "下一页";
        next.disabled = currentPage >= page.pages;
        next.addEventListener(
          "click",
          () => {
            currentPage = Math.min(page.pages, currentPage + 1);
            renderPage();
          },
          { signal },
        );
        nav.append(prev, next);
      }
      list.appendChild(nav);
    }

    if (foldLong) foldLongComments(signal);
  };

  const load = async () => {
    if (!list) return;
    const response = await fetch(endpoint + "?post=" + postId, { headers: { accept: "application/json" } });
    if (!response.ok) return;
    allItems = (await response.json()) as LiveComment[];
    currentPage = 1;
    renderPage();
  };
  void load().catch(() => undefined);

  document.querySelectorAll<HTMLElement>("#emotion_keyboard .emotion-item").forEach((item) => {
    item.addEventListener(
      "click",
      () => {
        const field = form?.querySelector<HTMLTextAreaElement>("[name=content]");
        if (!field) return;
        const token = item.getAttribute("text") || ":" + (item.getAttribute("code") || "") + ":";
        const next = insertEmotion(field.value, field.selectionStart || 0, field.selectionEnd || 0, token);
        field.value = next.value;
        field.setSelectionRange(next.caret, next.caret);
        field.focus();
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLButtonElement>("#emotion_keyboard .emotion-group-name").forEach((tab) => {
    tab.addEventListener(
      "click",
      () => {
        const index = tab.dataset.index;
        document.querySelectorAll("#emotion_keyboard .emotion-group").forEach((group) => {
          group.classList.toggle("d-none", group.getAttribute("index") !== index);
        });
        document
          .querySelectorAll("#emotion_keyboard .emotion-group-name")
          .forEach((name) => name.classList.remove("active"));
        tab.classList.add("active");
      },
      { signal },
    );
  });

  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId,
          author: String(data.get("author") ?? ""),
          email: String(data.get("email") ?? ""),
          url: String(data.get("url") ?? ""),
          content: String(data.get("content") ?? ""),
          mailNotice: data.get("mailNotice") === "on",
          markdown: options.allowMarkdown && data.get("useMarkdown") === "on",
          private: options.allowPrivateMode && data.get("privateMode") === "on",
          captchaToken: String(data.get("captchaToken") ?? ""),
          captchaAnswer: String(data.get("captchaAnswer") ?? ""),
        }),
      });
      if (status) status.textContent = response.ok ? "Sent." : "Comment service is unavailable.";
      if (response.ok) {
        form.reset();
        await load();
        await refreshCaptcha();
      }
    },
    { signal },
  );
}
