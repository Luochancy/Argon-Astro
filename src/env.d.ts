/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ARGON_SOURCE?: string;
  readonly WP_URL?: string;
  readonly WP_USER?: string;
  readonly WP_APP_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
