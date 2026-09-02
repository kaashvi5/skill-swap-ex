// Timezone helpers: convert a wall-clock date/time in an IANA zone to a real instant.

export const localTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const timezoneList = (): string[] => {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  let list: string[] = [];
  try {
    list = anyIntl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    list = [];
  }
  if (!list.length) {
    list = [
      "UTC", "Europe/London", "Europe/Berlin", "Europe/Madrid", "Europe/Moscow",
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
      "America/Sao_Paulo", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg",
      "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok",
      "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney", "Pacific/Auckland",
    ];
  }
  const local = localTimezone();
  return Array.from(new Set([local, "UTC", ...list]));
};

/** Offset (ms) of a timezone at a given instant: zoneWallTime - utcWallTime. */
const offsetMs = (instant: Date, timeZone: string): number => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second)
  );
  return asUtc - instant.getTime();
};

/** "2026-09-05" + "14:30" in `timeZone` -> the matching UTC instant. */
export const zonedToUtc = (date: string, time: string, timeZone: string): Date => {
  const naive = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(naive)) return new Date(NaN);
  let guess = naive - offsetMs(new Date(naive), timeZone);
  guess = naive - offsetMs(new Date(guess), timeZone);
  return new Date(guess);
};

export const formatInZone = (instant: Date | string, timeZone: string): string => {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat(undefined, {
    timeZone, dateStyle: "medium", timeStyle: "short", timeZoneName: "short",
  }).format(d);
};
