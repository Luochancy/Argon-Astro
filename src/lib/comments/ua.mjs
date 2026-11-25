export function parseUserAgent(userAgent) {
  const ua = String(userAgent || "");
  let platform = "Unknown";
  if (/Windows/i.test(ua)) platform = "Windows";
  else if (/Android/i.test(ua)) platform = "Android";
  else if (/iPhone|iPad/i.test(ua)) platform = "iOS";
  else if (/Mac OS X/i.test(ua)) platform = "Mac";
  else if (/Linux/i.test(ua)) platform = "Linux";
  let browser = "Unknown";
  let version = "";
  const edge = /Edg\/([\d.]+)/.exec(ua);
  const chrome = /Chrome\/([\d.]+)/.exec(ua);
  const firefox = /Firefox\/([\d.]+)/.exec(ua);
  const safari = /Version\/([\d.]+).*Safari/.exec(ua);
  if (edge) { browser = "Edge"; version = edge[1]; }
  else if (chrome) { browser = "Chrome"; version = chrome[1]; }
  else if (firefox) { browser = "Firefox"; version = firefox[1]; }
  else if (safari) { browser = "Safari"; version = safari[1]; }
  return { platform, browser, version };
}

export function renderUserAgent(userAgent) {
  if (!userAgent) return "";
  const parsed = parseUserAgent(userAgent);
  if (parsed.platform === "Unknown" && parsed.browser === "Unknown") return "";
  return '<div class="comment-useragent">' + [parsed.platform, parsed.browser, parsed.version].filter(Boolean).join(" ") + "</div>";
}
