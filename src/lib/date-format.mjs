export function formatDate(value, pattern = "YMD") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (pattern === "MDY") return month + "/" + day + "/" + year;
  if (pattern === "DMY") return day + "/" + month + "/" + year;
  return year + "-" + month + "-" + day;
}
