import type { ClientConfig, ThemeConfig } from "./types";

/** Safe to inline into HTML. Must not include a CMS host or credential. */
export function toClientConfig(config: ThemeConfig): ClientConfig {
  return {
    language: config.site.language,
    appearance: {
      color: config.appearance.color,
      cardRadius: config.appearance.cardRadius,
      darkmode: config.appearance.darkmode,
      amoledDark: config.appearance.amoledDark,
      font: config.appearance.font,
      cardShadow: config.appearance.cardShadow,
      allowColorPicker: config.appearance.allowColorPicker,
    },
    banner: {
      typing: config.banner.typing,
      typingInterval: config.banner.typingInterval,
    },
    motion: { ...config.motion, waterflow: config.article.waterflow },
    fab: config.fab,
    toolbar: { headroom: config.toolbar.headroom, blur: config.toolbar.blur },
    upvote: { mode: config.source === "wordpress" ? "private" : "local" },
    agent: {
      enabled: config.agent.enabled,
      webMcp: config.agent.webMcp,
      llmsTxt: config.agent.llmsTxt,
      jsonIndex: config.agent.jsonIndex,
    },
    comments: {
      provider: config.comments.provider,
      endpoint: "/api/comments",
      allowEdit: config.comments.allowEdit,
      allowMarkdown: config.comments.allowMarkdown,
      allowPrivateMode: config.comments.allowPrivateMode,
      enableQqAvatar: config.comments.enableQqAvatar,
      enableUpvote: config.comments.enableUpvote,
      paginationType: config.comments.paginationType,
      showParentInfo: config.comments.showParentInfo,
      gravatarCdn: config.comments.gravatarCdn,
      captchaAjax: config.comments.captchaAjax,
    },
  };
}
