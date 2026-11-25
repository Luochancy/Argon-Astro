export function shareLinks(pageUrl, title, region = "all") {
  const encoded = encodeURIComponent(pageUrl);
  const text = encodeURIComponent(title);
  const links = [];
  if (region !== "abroad") {
    links.push({ id: "wechat", href: "" });
    links.push({ id: "douban", href: "https://www.douban.com/share/service?href=" + encoded + "&name=" + text });
    links.push({ id: "qq", href: "https://connect.qq.com/widget/shareqq/index.html?url=" + encoded + "&title=" + text });
    links.push({ id: "qzone", href: "https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=" + encoded + "&title=" + text });
    links.push({ id: "weibo", href: "https://service.weibo.com/share/share.php?url=" + encoded + "&title=" + text });
  }
  if (region !== "domestic") {
    links.push({ id: "facebook", href: "https://www.facebook.com/sharer/sharer.php?u=" + encoded });
    links.push({ id: "twitter", href: "https://twitter.com/intent/tweet?url=" + encoded + "&text=" + text });
    links.push({ id: "telegram", href: "https://telegram.me/share/url?url=" + encoded + "&text=" + text });
  }
  links.push({ id: "copy-link", href: pageUrl });
  return links;
}
