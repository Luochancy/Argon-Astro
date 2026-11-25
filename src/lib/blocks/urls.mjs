export function publicUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/wp-json|wp-admin|admin-ajax\.php/i.test(value)) return "";
  return value;
}
