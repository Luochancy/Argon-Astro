interface HighlightOptions {
  enable: boolean;
  hideLineNumber: boolean;
  breakLine: boolean;
  transparentLineNumber: boolean;
  theme: string;
}

interface HljsGlobal {
  highlightElement?: (el: Element) => void;
  highlightBlock?: (el: Element) => void;
  lineNumbersBlock?: (el: Element, opts: { singleLine: boolean }) => void;
}

const loadedAssets = new Map<string, Promise<void>>();

/** Load a stylesheet or script, verifying link tags still live in document.head after PJAX head swaps. */
function loadAsset(tag: "link" | "script", url: string): Promise<void> {
  const key = `${tag}:${url}`;
  const existing =
    tag === "link"
      ? document.head.querySelector(`link[rel="stylesheet"][href="${CSS.escape(url)}"]`)
      : document.querySelector(`script[src="${CSS.escape(url)}"]`);

  const cached = loadedAssets.get(key);
  if (cached) {
    if (tag === "script" || existing) return cached;
    // Stylesheet was dropped by ClientRouter head swap; reload it.
    loadedAssets.delete(key);
  }

  if (existing) {
    const done = Promise.resolve();
    loadedAssets.set(key, done);
    return done;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const node = document.createElement(tag);
    if (tag === "link") {
      const link = node as HTMLLinkElement;
      link.rel = "stylesheet";
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => {
        loadedAssets.delete(key);
        reject(new Error("stylesheet failed"));
      };
      document.head.appendChild(link);
      return;
    }
    const script = node as HTMLScriptElement;
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => {
      loadedAssets.delete(key);
      reject(new Error("script failed"));
    };
    document.body.appendChild(script);
  });

  loadedAssets.set(key, promise);
  return promise;
}

function labels(): {
  hideLine: string;
  showLine: string;
  enableWrap: string;
  disableWrap: string;
  copy: string;
  fullscreen: string;
  exitFullscreen: string;
  copiedTitle: string;
  copiedMessage: string;
  failedTitle: string;
  failedMessage: string;
} {
  const isEn = document.documentElement.lang.toLowerCase().startsWith("en");
  if (isEn) {
    return {
      hideLine: "Hide Line Numbers",
      showLine: "Show Line Numbers",
      enableWrap: "Enable Break Line",
      disableWrap: "Disable Break Line",
      copy: "Copy",
      fullscreen: "Fullscreen",
      exitFullscreen: "Exit Fullscreen",
      copiedTitle: "Copied",
      copiedMessage: "Code has been copied to the clipboard",
      failedTitle: "Failed",
      failedMessage: "Please copy the code manually",
    };
  }
  return {
    hideLine: "隐藏行号",
    showLine: "显示行号",
    enableWrap: "开启折行",
    disableWrap: "关闭折行",
    copy: "复制",
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    copiedTitle: "复制成功",
    copiedMessage: "代码已复制到剪贴板",
    failedTitle: "复制失败",
    failedMessage: "请手动复制代码",
  };
}

function showToast(title: string, message: string, ok: boolean): void {
  let container = document.querySelector<HTMLElement>(".argon-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "argon-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = ok ? "argon-toast" : "argon-toast is-error";
  toast.setAttribute("role", "status");
  toast.innerHTML =
    `<i class="argon-toast-icon fa ${ok ? "fa-check" : "fa-close"}" aria-hidden="true"></i>` +
    '<div class="argon-toast-body">' +
      '<div class="argon-toast-title"></div>' +
      '<div class="argon-toast-message"></div>' +
    "</div>";
  toast.querySelector(".argon-toast-title")!.textContent = title;
  toast.querySelector(".argon-toast-message")!.textContent = message;
  container.appendChild(toast);

  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 260);
  }, 3000);
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea copy fallback.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
}

function extractCode(pre: Element, fallbackRaw: string): string {
  const lines = pre.querySelectorAll<HTMLElement>(".hljs-ln-code");
  if (lines.length === 0) return fallbackRaw;
  return [...lines].map((cell) => cell.innerText).join("\n");
}

function bindButtonActivation(button: HTMLElement, handler: () => void, signal?: AbortSignal): void {
  button.addEventListener("click", handler, { signal });
  button.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    },
    { signal },
  );
}

/** Highlight article codeblocks with upstream Argon's 4-button .hljs-control bar. */
export async function bindHighlight(options: HighlightOptions, signal?: AbortSignal): Promise<void> {
  if (!options.enable) return;

  // Defer downloading highlight.pack.js (~114 KB) unless this page actually has code blocks.
  const codeBlocks = document.querySelectorAll("article pre > code");
  if (codeBlocks.length === 0) return;

  const theme = (options.theme || "vs2015").replace(/[^a-z0-9._/-]/gi, "");
  try {
    await loadAsset("link", `/argon/vendor/highlight/styles/${theme}.css`);
    await loadAsset("script", "/argon/vendor/highlight/highlight.pack.js");
    await loadAsset("script", "/argon/vendor/highlight/highlightjs-line-numbers.min.js");
  } catch {
    return;
  }

  if (signal?.aborted) return;
  const hljs = (window as unknown as { hljs?: HljsGlobal }).hljs;
  if (!hljs) return;

  const text = labels();

  const toggleFullscreen = (pre: HTMLElement, force?: boolean) => {
    const isFull = pre.classList.toggle("hljs-codeblock-fullscreen", force);
    document.documentElement.classList.toggle("noscroll", isFull);
    document.documentElement.classList.toggle("codeblock-fullscreen", isFull);
  };

  document.querySelectorAll("article pre > code").forEach((block) => {
    const pre = block.parentElement;
    if (!pre || pre.classList.contains("no-hljs") || block.classList.contains("no-hljs")) return;
    if (pre.classList.contains("hljs-codeblock")) return;

    const rawCode = (block.textContent ?? "").replace(/\r?\n$/, "");
    block.textContent = rawCode;

    if (hljs.highlightElement) hljs.highlightElement(block);
    else hljs.highlightBlock?.(block);
    hljs.lineNumbersBlock?.(block, { singleLine: true });

    pre.classList.add("hljs-codeblock");
    if (options.hideLineNumber) pre.classList.add("hljs-hide-linenumber");
    if (options.breakLine) pre.classList.add("hljs-break-line");
    if (options.transparentLineNumber) pre.classList.add("hljs-transparent-linenumber");
    block.setAttribute("hljs-codeblock-inner", "");

    // Build upstream Argon 4-button .hljs-control bar.
    const control = document.createElement("div");
    control.className = "hljs-control hljs hljs-title";

    const lineBtn = document.createElement("div");
    lineBtn.className = "hljs-control-btn hljs-control-toggle-linenumber";
    lineBtn.setAttribute("role", "button");
    lineBtn.tabIndex = 0;
    lineBtn.setAttribute("tooltip-hide-linenumber", text.hideLine);
    lineBtn.setAttribute("tooltip-show-linenumber", text.showLine);
    lineBtn.innerHTML = '<i class="fa fa-list" aria-hidden="true"></i>';

    const wrapBtn = document.createElement("div");
    wrapBtn.className = "hljs-control-btn hljs-control-toggle-break-line";
    wrapBtn.setAttribute("role", "button");
    wrapBtn.tabIndex = 0;
    wrapBtn.setAttribute("tooltip-enable-breakline", text.enableWrap);
    wrapBtn.setAttribute("tooltip-disable-breakline", text.disableWrap);
    wrapBtn.innerHTML = '<i class="fa fa-align-left" aria-hidden="true"></i>';

    const copyBtn = document.createElement("div");
    copyBtn.className = "hljs-control-btn hljs-control-copy";
    copyBtn.setAttribute("role", "button");
    copyBtn.tabIndex = 0;
    copyBtn.setAttribute("tooltip", text.copy);
    copyBtn.innerHTML = '<i class="fa fa-clipboard" aria-hidden="true"></i>';

    const fullBtn = document.createElement("div");
    fullBtn.className = "hljs-control-btn hljs-control-fullscreen";
    fullBtn.setAttribute("role", "button");
    fullBtn.tabIndex = 0;
    fullBtn.setAttribute("tooltip-fullscreen", text.fullscreen);
    fullBtn.setAttribute("tooltip-exit-fullscreen", text.exitFullscreen);
    fullBtn.innerHTML = '<i class="fa fa-arrows-alt" aria-hidden="true"></i>';

    bindButtonActivation(lineBtn, () => pre.classList.toggle("hljs-hide-linenumber"), signal);
    bindButtonActivation(wrapBtn, () => pre.classList.toggle("hljs-break-line"), signal);
    bindButtonActivation(
      copyBtn,
      () => {
        void copyText(extractCode(pre, rawCode)).then((ok) => {
          showToast(
            ok ? text.copiedTitle : text.failedTitle,
            ok ? text.copiedMessage : text.failedMessage,
            ok,
          );
        });
      },
      signal,
    );
    bindButtonActivation(fullBtn, () => toggleFullscreen(pre), signal);

    control.append(lineBtn, wrapBtn, copyBtn, fullBtn);
    pre.appendChild(control);
  });

  // Allow Escape to exit any fullscreen codeblock cleanly.
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      const openBlock = document.querySelector<HTMLElement>("pre.hljs-codeblock.hljs-codeblock-fullscreen");
      if (openBlock) toggleFullscreen(openBlock, false);
    },
    { signal },
  );

  signal?.addEventListener(
    "abort",
    () => {
      document.documentElement.classList.remove("noscroll", "codeblock-fullscreen");
    },
    { once: true },
  );
}
