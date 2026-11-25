import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { acceptsMarkdown, resolveNegotiatedMarkdownPath } from "./src/lib/agent/negotiate.mjs";

const generated = new URL("./src/generated/theme-config.json", import.meta.url);
const site = existsSync(generated) ? JSON.parse(readFileSync(generated, "utf8")).site?.url : "http://localhost:4321";
const yamlEsm = fileURLToPath(new URL("./node_modules/yaml/browser/index.js", import.meta.url));
const picomatchShim = fileURLToPath(new URL("./shims/picomatch.mjs", import.meta.url));

/** Local dev middleware mirroring Cloudflare Worker `Accept: text/markdown` content negotiation. */
const markdownNegotiationIntegration = {
  name: "argon-markdown-negotiation",
  hooks: {
    "astro:server:setup": ({ server }) => {
      server.middlewares.use((req, res, next) => {
        if ((req.method === "GET" || req.method === "HEAD") && acceptsMarkdown(req.headers.accept)) {
          const mdPath = resolveNegotiatedMarkdownPath(req.url || "/");
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
  },
};

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  integrations: [markdownNegotiationIntegration],
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
