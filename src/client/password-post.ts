/** Decrypt AES-256-GCM password-protected static posts in the browser using Web Crypto API. */
interface EncryptedPayload {
  v: number;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

function fromBase64(b64: string): Uint8Array {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function decryptInBrowser(payload: EncryptedPayload, password: string): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable in this browser context.");
  }
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ct);
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: Number(payload.iter) || 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    aesKey,
    ciphertext.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(plainBuffer);
}

/** Bind Argon password-protected post unlock forms and re-initialize content widgets after unlock. */
export function bindPasswordPost(onUnlocked: () => void, signal?: AbortSignal): void {
  const gate = document.querySelector<HTMLElement>(".argon-password-gate");
  const form = gate?.querySelector<HTMLFormElement>(".post-password-form");
  if (!gate || !form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  const postId = gate.dataset.postId || location.pathname;
  const mode = gate.dataset.mode || "local";
  const storageKey = `Argon_PostPass_${postId}`;
  const input = form.querySelector<HTMLInputElement>("input[name='post_password']");
  const errorBox = form.querySelector<HTMLElement>(".post-password-error");
  const submitBtn = form.querySelector<HTMLButtonElement>("button[type='submit']");
  const payloadNode = gate.querySelector<HTMLScriptElement>(".argon-encrypted-payload");

  const showError = (msg: string) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.hidden = false;
  };

  const reveal = (html: string) => {
    const container = gate.closest("#post_content") || gate.parentElement;
    if (!container) return;
    const wrapper = document.createElement("div");
    wrapper.className = "argon-unlocked-content";
    wrapper.innerHTML = html;
    gate.replaceWith(wrapper);
    onUnlocked();
  };

  const unlockWith = async (password: string, silent = false): Promise<boolean> => {
    if (errorBox) errorBox.hidden = true;
    if (mode === "local" && payloadNode?.textContent) {
      try {
        const payload = JSON.parse(payloadNode.textContent) as EncryptedPayload;
        const html = await decryptInBrowser(payload, password);
        sessionStorage.setItem(storageKey, password);
        reveal(html);
        return true;
      } catch {
        if (!silent) showError("密码错误，请重试。");
        return false;
      }
    }

    // Headless WordPress locked posts can unlock through an optional same-origin /api/post-unlock proxy.
    try {
      const response = await fetch("/api/post-unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: postId, password }),
      });
      if (!response.ok) {
        if (!silent) showError(response.status === 403 ? "密码错误，请重试。" : "当前静态部署未启用在线解密接口。");
        return false;
      }
      const data = (await response.json()) as { html?: string };
      if (!data.html) {
        if (!silent) showError("未能获取文章正文。");
        return false;
      }
      reveal(data.html);
      return true;
    } catch {
      if (!silent) showError("当前静态部署未启用在线解密接口。");
      return false;
    }
  };

  // Auto-unlock if the visitor already entered the valid password in this session.
  const cached = sessionStorage.getItem(storageKey);
  if (cached && mode === "local") {
    void unlockWith(cached, true);
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const password = input?.value ?? "";
      if (!password) {
        showError("请输入访问密码。");
        input?.focus();
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      try {
        await unlockWith(password, false);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    },
    { signal },
  );
}
