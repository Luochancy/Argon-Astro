export interface WordpressEnv {
  url: string;
  user: string;
  password: string;
}

export function readWordpressEnv(): WordpressEnv | null {
  const url = process.env.WP_URL?.replace(/\/$/, "");
  const user = process.env.WP_USER;
  const password = process.env.WP_APP_PASSWORD;
  if (!url || !user || !password) return null;
  return { url, user, password };
}
