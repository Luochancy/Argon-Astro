// Timezone-aware date formatting helpers supporting IANA names (e.g. Asia/Shanghai) and fixed offsets (e.g. +08:00).

export function resolveTimeZone(config) {
  const tz = String(config?.site?.timezone || "").trim();
  if (tz) return tz;
  const lang = String(config?.site?.language || "").toLowerCase();
  return lang.startsWith("zh") ? "Asia/Shanghai" : "UTC";
}

function parseFixedOffsetMinutes(tz) {
  const match = /^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(String(tz || "").trim());
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  if (hours > 14 || minutes >= 60) return null;
  return sign * (hours * 60 + minutes);
}

export function dateParts(value, timeZone = "") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const tz = String(timeZone || "").trim();
  if (tz) {
    const offsetMin = parseFixedOffsetMinutes(tz);
    if (offsetMin !== null) {
      const shifted = new Date(date.getTime() + offsetMin * 60_000);
      const year = String(shifted.getUTCFullYear());
      const monthNum = shifted.getUTCMonth() + 1;
      const month = String(monthNum).padStart(2, "0");
      const day = String(shifted.getUTCDate()).padStart(2, "0");
      const hour = String(shifted.getUTCHours()).padStart(2, "0");
      const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
      const second = String(shifted.getUTCSeconds()).padStart(2, "0");
      return { year, month, monthNum, day, hour, minute, second, hm: `${hour}:${minute}`, hms: `${hour}:${minute}:${second}` };
    }
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      const map = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
      const year = map.year || String(date.getUTCFullYear());
      const month = map.month || "01";
      const day = map.day || "01";
      const hour = map.hour === "24" ? "00" : (map.hour || "00");
      const minute = map.minute || "00";
      const second = map.second || "00";
      return {
        year,
        month,
        monthNum: Number(month),
        day,
        hour,
        minute,
        second,
        hm: `${hour}:${minute}`,
        hms: `${hour}:${minute}:${second}`,
      };
    } catch {
      // Fall through to UTC/local below if timeZone string is invalid.
    }
  }

  const year = String(date.getFullYear());
  const monthNum = date.getMonth() + 1;
  const month = String(monthNum).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return { year, month, monthNum, day, hour, minute, second, hm: `${hour}:${minute}`, hms: `${hour}:${minute}:${second}` };
}

export function formatDate(value, pattern = "YMD", timeZone = "") {
  const parts = dateParts(value, timeZone);
  if (!parts) return "";
  if (pattern === "MDY") return `${parts.month}/${parts.day}/${parts.year}`;
  if (pattern === "DMY") return `${parts.day}/${parts.month}/${parts.year}`;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDateTime(value, pattern = "YMD", timeZone = "") {
  const parts = dateParts(value, timeZone);
  if (!parts) return "";
  return `${formatDate(value, pattern, timeZone)} ${parts.hm}`;
}

export function formatDateTimeSeconds(value, pattern = "YMD", timeZone = "") {
  const parts = dateParts(value, timeZone);
  if (!parts) return "";
  return `${formatDate(value, pattern, timeZone)} ${parts.hms}`;
}
