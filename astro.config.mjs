import { readFileSync, existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { acceptsMarkdown, resolveNegotiatedMarkdownPath } from "./src/lib/agent/negotiate.mjs";

const generated = new URL("./src/generated/theme-config.json", import.meta.url);
const site = existsSync(generated) ? JSON.parse(readFileSync(generated, "utf8")).site?.url : "http://localhost:4321";
const yamlEsm = fileURLToPath(new URL("./node_modules/yaml/browser/index.js", import.meta.url));
const picomatchShim = fileURLToPath(new URL("./shims/picomatch.mjs", import.meta.url));

/** Flatten Astro `*.html/index.html` directories into actual static `.html` files for WP permalink parity. */
function flattenHtmlPermalinkDirs(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (!stat.isDirectory()) continue;
    const indexFile = join(full, "index.html");
    if (/\.html?$/i.test(name) && existsSync(indexFile)) {
      const tmp = full + ".argon-tmp";
      renameSync(indexFile, tmp);
      rmSync(full, { recursive: true, force: true });
      renameSync(tmp, full);
    } else {
      flattenHtmlPermalinkDirs(full);
    }
  }
}

/** Local dev middleware mirroring Cloudflare Worker `Accept: text/markdown` negotiation, `/api/bing`, and `.html` flattening. */
const argonRoutingIntegration = {
  name: "argon-routing",
  hooks: {
    "astro:server:setup": ({ server }) => {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || "/";
        const pathname = rawUrl.split("?")[0];
        if ((req.method === "GET" || req.method === "HEAD") && pathname === "/api/bing") {
          try {
            const apiRes = await fetch("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1");
            const data = await apiRes.json();
            const rel = data?.images?.[0]?.url;
            if (typeof rel === "string" && rel.startsWith("/")) {
              res.statusCode = 302;
              res.setHeader("Location", "https://www.bing.com" + rel);
              res.end();
              return;
            }
          } catch {
            // Fall through to 502.
          }
          res.statusCode = 502;
          res.end("Bing wallpaper unavailable.");
          return;
        }
        if ((req.method === "GET" || req.method === "HEAD") && acceptsMarkdown(req.headers.accept)) {
          const mdPath = resolveNegotiatedMarkdownPath(rawUrl);
          if (mdPath) {
            req.url = mdPath;
            const origSetHeader = res.setHeader.bind(res);
            res.setHeader = (name, value) => {
              if (String(name).toLowerCase() === "content-type") {
                return origSetHeader("Content-Type", "text/markdown; charset=utf-8");
              }
              return origSetHeader(name, value);
            };
            origSetHeader("Vary", "Accept");
          }
        }
        next();
      });
    },
    "astro:build:done": ({ dir }) => {
      flattenHtmlPermalinkDirs(fileURLToPath(dir));
    },
  },
};

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "ignore",
  integrations: [argonRoutingIntegration],
  vite: {
    envPrefix: "PUBLIC_",
    resolve: {
      alias: {
        yaml: yamlEsm,
        picomatch: picomatchShim,
      },
    },
  },
});
