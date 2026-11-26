// Taxonomy URL alias mapping & legacy WordPress tag/category route resolution.

function safeDecode(segment) {
  let out = String(segment || "").trim();
  if (!out) return "";
  try {
    out = decodeURIComponent(out);
  } catch {
    // Keep raw value if malformed.
  }
  return out.trim();
}

function slugCandidates(name, explicitSlug = "") {
  const keys = new Set();
  const add = (val) => {
    const clean = safeDecode(val).toLowerCase();
    if (clean) keys.add(clean);
  };
  add(name);
  if (explicitSlug) add(explicitSlug);
  const hyphen = safeDecode(name).toLowerCase().replace(/\s+/g, "-");
  if (hyphen) keys.add(hyphen);
  return [...keys];
}

/**
 * Build a compact lookup map from lowercase tag/category names and WP slugs
 * to their canonical built paths (`/tags/<encoded>/`, `/categories/<encoded>/`).
 */
export function buildTaxonomyRouteMap(posts, config = {}) {
  const tags = {};
  const categories = {};

  const wpTags = Array.isArray(config?.taxonomies?.tags) ? config.taxonomies.tags : [];
  const wpCategories = Array.isArray(config?.taxonomies?.categories) ? config.taxonomies.categories : [];

  const wpTagSlugByName = new Map();
  for (const term of wpTags) {
    if (term && term.name) wpTagSlugByName.set(String(term.name).toLowerCase(), String(term.slug || ""));
  }
  const wpCatSlugByName = new Map();
  for (const term of wpCategories) {
    if (term && term.name) wpCatSlugByName.set(String(term.name).toLowerCase(), String(term.slug || ""));
  }

  const seenTags = new Set();
  const seenCats = new Set();
  for (const post of posts || []) {
    for (const tag of post?.data?.tags || []) seenTags.add(String(tag));
    for (const cat of post?.data?.categories || []) seenCats.add(String(cat));
  }

  for (const tag of seenTags) {
    const target = "/tags/" + encodeURIComponent(tag) + "/";
    const wpSlug = wpTagSlugByName.get(tag.toLowerCase()) || "";
    for (const key of slugCandidates(tag, wpSlug)) {
      if (!tags[key]) tags[key] = target;
    }
  }

  for (const cat of seenCats) {
    const target = "/categories/" + encodeURIComponent(cat) + "/";
    const wpSlug = wpCatSlugByName.get(cat.toLowerCase()) || "";
    for (const key of slugCandidates(cat, wpSlug)) {
      if (!categories[key]) categories[key] = target;
    }
  }

  return { tags, categories };
}

const TAXONOMY_ALIAS_RE = /^\/(?:(?:archives|archive)\/)?(tags?|categories|category)\/([^/]+)(?:\/page\/\d+)?\/?$/i;

/**
 * Resolve legacy WordPress taxonomy URLs (`/archives/tag/cuda`, `/archive/tag/cuda`,
 * `/tag/cuda`, `/tags/cuda`, `/archives/category/...`, `/category/...`) to canonical paths.
 */
export function resolveTaxonomyAliasPath(pathname, taxonomyMap) {
  if (!taxonomyMap || typeof taxonomyMap !== "object") return null;
  const clean = String(pathname || "").split(/[?#]/)[0];
  const match = TAXONOMY_ALIAS_RE.exec(clean);
  if (!match) return null;

  const kindToken = match[1].toLowerCase();
  const rawTerm = match[2];
  const key = safeDecode(rawTerm).toLowerCase();
  if (!key) return null;

  const bucket = kindToken.startsWith("tag") ? taxonomyMap.tags : taxonomyMap.categories;
  if (!bucket || typeof bucket !== "object") return null;
  if (bucket[key]) return bucket[key];

  // Fallback for URL-encoded/hyphen-vs-space variations (e.g. `luocy-cloud` vs `luocy cloud`).
  const altSpace = key.replace(/-/g, " ");
  if (bucket[altSpace]) return bucket[altSpace];
  const altHyphen = key.replace(/\s+/g, "-");
  if (bucket[altHyphen]) return bucket[altHyphen];
  return null;
}
