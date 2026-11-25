import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import rawConfig from "../generated/theme-config.json";
import { mergeRemoteTheme, normalizeConfig } from "./normalize";
import type { SourceMode, ThemeConfig } from "./types";

export function themeRoot(): string {
  return process.cwd();
}

export function loadThemeConfig(): ThemeConfig {
  let config = normalizeConfig(rawConfig);
  const requested = process.env.ARGON_SOURCE as SourceMode | undefined;
  config.source = requested === "wordpress" || config.source === "wordpress" ? "wordpress" : "local";
  if (config.source === "wordpress") {
    const remoteFile = join(themeRoot(), ".cache", "wp-theme.json");
    const snapshot = join(themeRoot(), ".cache", "snapshot-complete.json");
    if (!existsSync(remoteFile) || !existsSync(snapshot)) {
      throw new Error("WordPress snapshot is incomplete. Refusing to build a partial site.");
    }
    config = mergeRemoteTheme(config, JSON.parse(readFileSync(remoteFile, "utf8")));
  }
  return config;
}
