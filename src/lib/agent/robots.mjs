// Generate RFC 9309 compliant robots.txt or return the user's custom robots.txt verbatim.

export function buildRobotsTxt(config) {
  const custom = String(config.agent?.customRobotsTxt || "").replace(/\r\n/g, "\n").trim();
  if (custom) {
    return custom + "\n";
  }

  const base = String(config.site?.url || "").trim().replace(/\/$/, "");
  const hasAbsoluteBase = /^https?:\/\//i.test(base);
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
  ];
  if (config.agent?.enabled && config.agent?.allowTrainingCrawlers === false) {
    for (const bot of ["GPTBot", "CCBot", "ClaudeBot", "Google-Extended", "Bytespider"]) {
      lines.push(`User-agent: ${bot}`, "Disallow: /", "");
    }
  }
  if (hasAbsoluteBase) {
    lines.push(`Sitemap: ${base}/sitemap.xml`);
  }
  if (config.agent?.enabled && config.agent?.llmsTxt) {
    // Keep robots.txt strictly RFC 9309 compliant (no non-standard directives).
    lines.push(`# AI Agent Discovery: ${hasAbsoluteBase ? base + "/llms.txt" : "/llms.txt"}`);
  }
  return lines.join("\n") + "\n";
}
