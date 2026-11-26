export interface MenuItem {
  label: string;
  href: string;
  icon?: string;
  target?: string;
  children: MenuItem[];
}

export interface FriendLink {
  name: string;
  url: string;
  description: string;
  avatar: string;
}

export interface AuthorLink {
  label: string;
  href: string;
  icon?: string;
}

export type SourceMode = "local" | "wordpress";
export type PageLayout = "single" | "double" | "double-reverse" | "triple";
export type DarkMode = "off" | "system" | "time" | "always";
export type BannerSize = "full" | "mini" | "hide" | "fullscreen";
export type CommentProvider = "none" | "giscus" | "waline" | "twikoo" | "artalk" | "wordpress";

export interface ThemeConfig {
  version: 1;
  source: SourceMode;
  site: {
    title: string;
    description: string;
    url: string;
    language: string;
    timezone?: string;
    keywords: string;
    icon?: string;
    dateFormat: "YMD" | "MDY" | "DMY";
  };
  appearance: {
    color: string;
    allowColorPicker: boolean;
    cardRadius: number;
    cardShadow: "small" | "big";
    font: "sans" | "serif";
    layout: PageLayout;
    immersionColor: boolean;
    amoledDark: boolean;
    darkmode: DarkMode;
    articleHeaderStyle: string;
    mobileScale: boolean;
    disableGoogleFont: boolean;
    customHeadHtml: string;
    customFootHtml: string;
  };
  banner: {
    size: BannerSize;
    title: string;
    subtitle: string;
    typing: boolean;
    typingInterval: number;
    backgroundUrl: string;
    hideShapes: boolean;
    colorType: string;
    toolbarMask: boolean;
  };
  background: {
    url: string;
    darkUrl: string;
    opacity: number;
    bannerStyle: "normal" | "transparent";
  };
  toolbar: {
    title: string;
    icon: string;
    iconLink: string;
    blur: boolean;
    headroom: "false" | "true" | "absolute";
    menu: MenuItem[];
  };
  sidebar: {
    announcement: string;
    bannerTitle: string;
    bannerSubtitle: string;
    authorName: string;
    authorDescription: string;
    authorImage: string;
    menu: MenuItem[];
    authorLinks: AuthorLink[];
    friendLinks?: AuthorLink[];
    widgets: { type: string; title: string; html?: string; items?: { label: string; href: string }[] }[];
    widgetsHtml?: string;
    extraHtml?: string;
    rightWidgetsHtml?: string;
  };
  article: {
    listLayout: "1" | "2" | "3";
    waterflow: string;
    meta: string[];
    hideCategories: boolean;
    showReadingTime: boolean;
    readingSpeed: number;
    readingSpeedEn: number;
    readingSpeedCode: number;
    trimWords: number;
    hideShortcodeInPreview: boolean;
    intoArticleAnimation: boolean;
    thumbnailInBanner: boolean;
    firstImageAsThumbnail: boolean;
    showShare: boolean;
    related: string;
    relatedLimit: number;
    relatedOrderBy: "date" | "title";
    relatedOrder: "asc" | "desc";
    outdatedDays: number;
    outdatedTip: string;
    outdatedTipType: "warning" | "info" | "inpost" | "toast";
    outdatedTimeType: "absolute" | "relative" | "createdtime" | "modifiedtime";
    archivesUrl: string;
    donateQr: string;
    afterPostHtml: string;
    showCatalogNumbers: boolean;
    timelineShowMonth: boolean;
    enableSearchFilters: boolean;
    searchFilters: ("post" | "page" | "shuoshuo")[];
    referenceTitle: string;
  };
  footer: {
    html: string;
    hideAuthor: boolean;
  };
  motion: {
    lazyload: boolean;
    lazyloadThreshold: number;
    lazyloadEffect: string;
    lazyloadLoadingStyle: string;
    zoomify: boolean;
    zoomifyDuration: number;
    zoomifyEasing: string;
    readingProgress: boolean;
    zoomifyScale: number;
    fancybox: boolean;
    smoothScroll: string;
    pangu: string;
    foldLongComments: boolean;
    foldLongShuoshuo: boolean;
    pjax: boolean;
    pjaxAnimation: boolean;
    codeHighlight: boolean;
    codeTheme: string;
    codeHideLineNumber: boolean;
    codeTransparentLineNumber: boolean;
    codeBreakLine: boolean;
    disableCodeblockStyle: boolean;
    math: "none" | "katex" | "mathjax2" | "mathjax3";
    katexCdn: string;
    mathjaxCdn: string;
    mathjaxV2Cdn: string;
  };
  fab: {
    darkmode: boolean;
    comment: boolean;
    settings: boolean;
  };
  home: {
    showShuoshuo: boolean;
    pageSize: number;
  };
  comments: {
    provider: CommentProvider;
    giscus: {
      repo: string;
      repoId: string;
      category: string;
      categoryId: string;
      mapping: string;
      lang: string;
    };
    waline: { serverURL: string; lang: string };
    twikoo: { envId: string; region: string };
    artalk: { server: string; site: string };
    wordpress: { endpoint: string };
    allowMailNotice: boolean;
    mailNoticeChecked: boolean;
    allowMarkdown: boolean;
    allowPrivateMode: boolean;
    hideAuthorInputs: boolean;
    captcha: boolean;
    captchaAjax: boolean;
    emotionKeyboard: boolean;
    allowEdit: boolean;
    editHistoryVisibility: "all" | "admin" | "none";
    enablePinning: boolean;
    enableUpvote: boolean;
    enableQqAvatar: boolean;
    textGravatar: boolean;
    showUa: boolean;
    showParentInfo: boolean;
    paginationType: "page" | "feed";
    avatarVcenter: boolean;
    gravatarCdn: string;
  };
  friendLinks: FriendLink[];
  taxonomies?: {
    tags?: { name: string; slug: string; permalink?: string }[];
    categories?: { name: string; slug: string; permalink?: string }[];
  };
  agent: {
    enabled: boolean;
    robotsTxt: boolean;
    llmsTxt: boolean;
    markdownMirrors: boolean;
    jsonIndex: boolean;
    jsonLd: boolean;
    webMcp: boolean;
    allowTrainingCrawlers: boolean;
    customRobotsTxt: string;
    customLlmsTxt: string;
  };
}

export interface ClientConfig {
  language: string;
  appearance: Pick<ThemeConfig["appearance"], "color" | "cardRadius" | "darkmode" | "amoledDark" | "font" | "cardShadow" | "allowColorPicker">;
  banner: Pick<ThemeConfig["banner"], "typing" | "typingInterval">;
  motion: ThemeConfig["motion"] & { waterflow: string };
  fab: ThemeConfig["fab"];
  toolbar: { headroom: string; blur: boolean };
  upvote: { mode: "local" | "private" };
  agent: Pick<ThemeConfig["agent"], "enabled" | "webMcp" | "llmsTxt" | "jsonIndex">;
  comments: {
    provider: CommentProvider;
    endpoint: string;
    allowEdit: boolean;
    allowMarkdown: boolean;
    allowPrivateMode: boolean;
    enableQqAvatar: boolean;
    enableUpvote: boolean;
    paginationType: "page" | "feed";
    showParentInfo: boolean;
    showUa: boolean;
    gravatarCdn: string;
    captchaAjax: boolean;
  };
}
