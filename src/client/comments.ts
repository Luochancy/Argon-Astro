import { insertEmotion, replaceStickers } from "../lib/comments/emotions.mjs";
import { pageComments, qqAvatarUrl } from "../lib/comments/identity.mjs";
import { gravatarUrl } from "../lib/comments/gravatar-url.mjs";
import { renderUserAgent } from "../lib/comments/ua.mjs";
import { foldLongComments } from "./fold";
import type { ClientConfig } from "./types";

interface LiveComment {
  id: number;
  parent?: number;
  author: string;
  content: string;
  date: string;
  url?: string;
  qq?: string;
  gravatar?: string;
  parentAuthor?: string;
  pinned?: boolean;
  private?: boolean;
  markdown?: boolean;
  upvotes?: number;
  userAgent?: string;
  editHistoryCount?: number;
}

const LS_AUTHOR = "Argon_Comment_Author";
const LS_EMAIL = "Argon_Comment_Email";
const LS_URL = "Argon_Comment_Url";

function escHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeAuthorHref(url?: string): string {
  const clean = String(url || "").trim();
  return /^https?:\/\//i.test(clean) ? clean : "";
}

function formatCommentDate(raw?: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderLiveCommentBody(content: string, useMarkdown: boolean): string {
  let html = escHtml(content);
  if (useMarkdown) {
    html = html
      .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener nofollow">$1</a>');
  }
  html = html.replace(/\r?\n/g, "<br>");
  return replaceStickers(html);
}

/** Bind headless WordPress live comments with reply, markdown, edit history, emotions, and identity memory. */
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
  const parentInput = form?.querySelector<HTMLInputElement>("input[name='parent']") ?? null;
  const replyBanner = document.getElementById("argon-reply-banner");
  const replyLabel = document.getElementById("argon-reply-label");
  const replyCancel = document.getElementById("argon-reply-cancel");
  const contentField = form?.querySelector<HTMLTextAreaElement>("[name='content']") ?? null;
  const authorField = form?.querySelector<HTMLInputElement>("[name='author']") ?? null;
  const emailField = form?.querySelector<HTMLInputElement>("[name='email']") ?? null;
  const urlField = form?.querySelector<HTMLInputElement>("[name='url']") ?? null;

  // Restore remembered visitor identity from localStorage.
  const restoreIdentity = () => {
    try {
      if (authorField && !authorField.value) authorField.value = localStorage.getItem(LS_AUTHOR) || "";
      if (emailField && !emailField.value) emailField.value = localStorage.getItem(LS_EMAIL) || "";
      if (urlField && !urlField.value) urlField.value = localStorage.getItem(LS_URL) || "";
    } catch {
      // Ignore storage failures in restricted contexts.
    }
  };
  restoreIdentity();

  const clearReply = () => {
    if (parentInput) parentInput.value = "0";
    if (replyBanner) replyBanner.classList.add("d-none");
    if (replyLabel) replyLabel.textContent = "";
  };

  const startReply = (commentId: number, authorName: string) => {
    if (parentInput) parentInput.value = String(commentId);
    if (replyLabel) replyLabel.textContent = `正在回复 @${authorName}`;
    if (replyBanner) replyBanner.classList.remove("d-none");
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    contentField?.focus();
  };

  replyCancel?.addEventListener("click", clearReply, { signal });

  const refreshCaptcha = async () => {
    if (!question) return;
    question.textContent = "...";
    const challenge = await fetch(endpoint + "?captcha=1", { headers: { accept: "application/json" } });
    if (!challenge.ok) {
      question.textContent = "";
      return;
    }
    const data = (await challenge.json()) as { question?: string; token?: string };
    question.textContent = data.question ? `${data.question} = ?` : "";
    const token = form?.querySelector<HTMLInputElement>("[name=captchaToken]");
    if (token && data.token) token.value = data.token;
  };
  question?.addEventListener("click", () => {
    void refreshCaptcha().catch(() => undefined);
  }, { signal });
  void refreshCaptcha().catch(() => undefined);

  // Bind emotion keyboard toggle button and click-outside dismissal.
  const emotionBtn = document.getElementById("comment_emotion_btn");
  const emotionPanel = document.getElementById("emotion_keyboard");
  emotionBtn?.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      emotionPanel?.classList.toggle("emotion-keyboard-open");
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (!emotionPanel?.classList.contains("emotion-keyboard-open")) return;
      const target = event.target as Node | null;
      if (target && (emotionPanel.contains(target) || emotionBtn?.contains(target))) return;
      emotionPanel.classList.remove("emotion-keyboard-open");
    },
    { signal },
  );

  let allItems: LiveComment[] = [];
  let currentPage = 1;
  const pageSize = 10;

  const renderPage = () => {
    if (!list) return;
    const ordered = [...allItems].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    const page = pageComments(ordered, currentPage, pageSize);
    const visible =
      options.paginationType === "feed" ? ordered.slice(0, currentPage * pageSize) : page.items;
    list.replaceChildren();

    const ol = document.createElement("ol");
    ol.className = "comment-list";

    for (const item of visible) {
      const row = document.createElement("li");
      row.className = "comment-item";
      row.id = `comment-${item.id}`;
      row.dataset.id = String(item.id);

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

      const inner = document.createElement("div");
      inner.className = "comment-item-inner";
      inner.id = `comment-inner-${item.id}`;

      const titleRow = document.createElement("div");
      titleRow.className = "comment-item-title";

      const nameWrap = document.createElement("div");
      nameWrap.className = "comment-name";

      const authorEl = document.createElement("div");
      authorEl.className = "comment-author";
      const authorHref = safeAuthorHref(item.url);
      if (authorHref) {
        const a = document.createElement("a");
        a.href = authorHref;
        a.target = "_blank";
        a.rel = "noopener nofollow";
        a.textContent = item.author;
        authorEl.appendChild(a);
      } else {
        authorEl.textContent = item.author;
      }
      nameWrap.appendChild(authorEl);

      if (item.pinned) {
        const badge = document.createElement("span");
        badge.className = "badge badge-danger badge-pinned ml-1";
        badge.textContent = "置顶";
        nameWrap.appendChild(badge);
      }
      if (item.private) {
        const badge = document.createElement("span");
        badge.className = "badge badge-success badge-private-comment ml-1";
        badge.textContent = "悄悄话";
        nameWrap.appendChild(badge);
      }
      if (options.showParentInfo !== false && item.parentAuthor) {
        const parent = document.createElement("span");
        parent.className = "comment-parent-info ml-1";
        parent.innerHTML = `<i class="fa fa-reply" aria-hidden="true"></i> ${escHtml(item.parentAuthor)}`;
        nameWrap.appendChild(parent);
      }
      if (options.showUa !== false && item.userAgent) {
        const uaHtml = renderUserAgent(item.userAgent);
        if (uaHtml) {
          const uaWrap = document.createElement("span");
          uaWrap.className = "ml-1";
          uaWrap.innerHTML = uaHtml;
          nameWrap.appendChild(uaWrap);
        }
      }

      const infoWrap = document.createElement("div");
      infoWrap.className = "comment-info";
      if (item.date) {
        const timeEl = document.createElement("div");
        timeEl.className = "comment-time";
        timeEl.textContent = formatCommentDate(item.date);
        infoWrap.appendChild(timeEl);
      }

      titleRow.append(nameWrap, infoWrap);

      const body = document.createElement("div");
      body.className = "comment-item-text";
      if (item.private) {
        body.innerHTML = '<span class="text-muted">此条悄悄话仅博主可见。</span>';
      } else {
        body.innerHTML = renderLiveCommentBody(item.content, Boolean(item.markdown));
      }

      inner.append(titleRow, body);

      const ops = document.createElement("div");
      ops.className = "comment-operations mt-1";

      if (form && !item.private) {
        const replyBtn = document.createElement("button");
        replyBtn.type = "button";
        replyBtn.className = "comment-reply btn btn-sm btn-outline-primary mr-1";
        replyBtn.textContent = "回复";
        replyBtn.addEventListener("click", () => startReply(item.id, item.author), { signal });
        ops.appendChild(replyBtn);
      }

      if (options.allowEdit && !item.private) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "comment-edit btn btn-sm btn-outline-primary mr-1";
        edit.dataset.id = String(item.id);
        edit.textContent = "编辑";
        edit.addEventListener(
          "click",
          async () => {
            const savedEmail = (() => {
              try { return localStorage.getItem(LS_EMAIL) || ""; } catch { return ""; }
            })();
            const email = window.prompt("请输入发表评论时填写的邮箱/QQ", savedEmail);
            const next = window.prompt("请输入修改后的内容", item.content || "");
            if (!email || !next) return;
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "edit", id: item.id, email, content: next }),
            });
            if (response.ok) {
              item.content = next;
              item.editHistoryCount = (item.editHistoryCount || 0) + 1;
              renderPage();
            } else {
              let msg = "无法修改该评论。";
              try {
                const err = (await response.json()) as { error?: string };
                if (err.error) msg = err.error;
              } catch { /* ignore */ }
              window.alert(msg);
            }
          },
          { signal },
        );
        ops.appendChild(edit);
      }

      if (Number(item.editHistoryCount || 0) > 0 && !item.private) {
        const histBtn = document.createElement("button");
        histBtn.type = "button";
        histBtn.className = "comment-edit-history-btn btn btn-sm btn-outline-secondary";
        histBtn.textContent = "编辑记录";
        const histBox = document.createElement("div");
        histBox.className = "comment-edit-history-box mt-2 d-none";
        histBtn.addEventListener(
          "click",
          async () => {
            if (!histBox.classList.contains("d-none")) {
              histBox.classList.add("d-none");
              return;
            }
            if (!histBox.dataset.loaded) {
              histBox.textContent = "加载中...";
              histBox.classList.remove("d-none");
              const res = await fetch(`${endpoint}?history=${item.id}`, { headers: { accept: "application/json" } });
              if (!res.ok) {
                histBox.textContent = "无法加载编辑记录。";
                return;
              }
              const data = (await res.json()) as { history?: { content: string; date: string }[] };
              const entries = Array.isArray(data.history) ? [...data.history].reverse() : [];
              histBox.replaceChildren();
              if (!entries.length) {
                histBox.textContent = "暂无历史版本。";
              } else {
                entries.forEach((entry, idx) => {
                  const card = document.createElement("div");
                  card.className = "comment-edit-history-item p-2 mb-1 rounded bg-secondary";
                  const meta = document.createElement("div");
                  meta.className = "small text-muted";
                  meta.textContent = `#${entries.length - idx} · ${formatCommentDate(entry.date)}`;
                  const txt = document.createElement("div");
                  txt.textContent = entry.content;
                  card.append(meta, txt);
                  histBox.appendChild(card);
                });
              }
              histBox.dataset.loaded = "true";
            } else {
              histBox.classList.remove("d-none");
            }
          },
          { signal },
        );
        ops.appendChild(histBtn);
        inner.append(ops, histBox);
      } else if (ops.childElementCount > 0) {
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
      const authorVal = String(data.get("author") ?? "").trim();
      const emailVal = String(data.get("email") ?? "").trim();
      const urlVal = String(data.get("url") ?? "").trim();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId,
          parent: Number(data.get("parent") || 0),
          author: authorVal,
          email: emailVal,
          url: urlVal,
          content: String(data.get("content") ?? ""),
          mailNotice: data.get("mailNotice") === "on",
          markdown: options.allowMarkdown && data.get("useMarkdown") === "on",
          private: options.allowPrivateMode && data.get("privateMode") === "on",
          captchaToken: String(data.get("captchaToken") ?? ""),
          captchaAnswer: String(data.get("captchaAnswer") ?? ""),
        }),
      });
      let payload: { error?: string; approved?: boolean } | null = null;
      try {
        payload = (await response.json()) as { error?: string; approved?: boolean };
      } catch {
        payload = null;
      }
      if (response.ok) {
        try {
          if (authorVal) localStorage.setItem(LS_AUTHOR, authorVal);
          if (emailVal) localStorage.setItem(LS_EMAIL, emailVal);
          localStorage.setItem(LS_URL, urlVal);
        } catch { /* ignore */ }
        if (status) {
          status.textContent = payload?.approved === false
            ? "评论已提交，等待审核后显示。"
            : "评论已发送。";
        }
        form.reset();
        clearReply();
        restoreIdentity();
        await load();
        await refreshCaptcha();
      } else {
        if (status) {
          status.textContent = payload?.error || "评论提交失败，请稍后重试。";
        }
        if (response.status === 400) {
          await refreshCaptcha().catch(() => undefined);
        }
      }
    },
    { signal },
  );
}
