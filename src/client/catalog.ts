import { activeHeadingIndex } from "../lib/catalog.mjs";
import { catalogNumbers } from "../lib/catalog-numbers.mjs";

/** Convert heading text into a URL-safe slug without pulling in server helpers. */
function slugify(text: string): string {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "section";
}

/** Generate a unique element ID against the set of already assigned IDs. */
function uniqueId(base: string, used: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

interface ListLevel {
  level: number;
  ul: HTMLUListElement;
  lastLi: HTMLLIElement | null;
}

/** Build a nested Argon sidebar table of contents with smooth offset scrolling and active scrollspy. */
export function bindCatalog(signal?: AbortSignal): void {
  const article = document.getElementById("post_content");
  const box = document.getElementById("leftbar_catalog");
  if (!article || !box) return;

  const headings = [...article.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")];
  if (headings.length === 0) return;

  const usedIds = new Set<string>();
  const rootList = document.createElement("ul");
  rootList.className = "index-box";

  const numbers = catalogNumbers(
    headings.map((heading) => heading.tagName.toLowerCase()),
    box.dataset.numbers === "true",
  );

  const items: HTMLLIElement[] = [];
  const stack: ListLevel[] = [];

  headings.forEach((heading, index) => {
    const tag = heading.tagName.toLowerCase();
    const level = Number.parseInt(tag.slice(1), 10) || 2;
    const rawId = heading.id ? heading.id : slugify(heading.textContent ?? "section");
    heading.id = uniqueId(rawId, usedIds);

    const item = document.createElement("li");
    item.className = `index-item index-${tag}`;

    const link = document.createElement("a");
    link.href = "#" + heading.id;
    link.className = "index-link";
    link.setAttribute("no-pjax", "");
    link.textContent = numbers[index] + (heading.textContent || "");

    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const top = heading.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        document.documentElement.classList.remove("leftbar-opened");
      },
      { signal },
    );

    item.appendChild(link);
    items.push(item);

    if (stack.length === 0) {
      rootList.appendChild(item);
      stack.push({ level, ul: rootList, lastLi: item });
      return;
    }

    while (stack.length > 1 && stack[stack.length - 1].level > level) {
      stack.pop();
    }

    const topFrame = stack[stack.length - 1];
    if (level > topFrame.level && topFrame.lastLi) {
      const subList = document.createElement("ul");
      subList.className = "index-subItem-box";
      topFrame.lastLi.appendChild(subList);
      subList.appendChild(item);
      stack.push({ level, ul: subList, lastLi: item });
    } else {
      if (level < topFrame.level) topFrame.level = level;
      topFrame.ul.appendChild(item);
      topFrame.lastLi = item;
    }
  });

  box.replaceChildren(rootList);

  const scrollBox = document.getElementById("leftbar_part2_inner");
  let lastActive = -1;

  const mark = () => {
    const scrollY = window.scrollY;
    const offsets = headings.map((heading) => heading.getBoundingClientRect().top + scrollY);
    const active = activeHeadingIndex(offsets, scrollY);

    if (active === lastActive) return;
    lastActive = active;

    items.forEach((item, index) => {
      item.classList.toggle("current", index === active);
    });

    if (active >= 0 && scrollBox && scrollBox.scrollHeight > scrollBox.clientHeight) {
      const activeEl = items[active];
      const boxRect = scrollBox.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();
      const relTop = itemRect.top - boxRect.top + scrollBox.scrollTop;
      const targetScroll = relTop - scrollBox.clientHeight * 0.35;
      scrollBox.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
    }
  };

  window.addEventListener("scroll", mark, { passive: true, signal });
  window.addEventListener("resize", mark, { passive: true, signal });
  mark();
}
