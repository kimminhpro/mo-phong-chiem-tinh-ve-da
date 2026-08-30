export type ObserverLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

// Used only while the browser location permission is pending or unavailable.
export const DEFAULT_OBSERVER: ObserverLocation = {
  id: "fallback",
  name: "Vị trí mặc định",
  latitude: 10.8231,
  longitude: 106.6297,
  timeZone: "Asia/Ho_Chi_Minh",
};

const dateTimeParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
};

export function formatDateTimeInput(date: Date, timeZone: string) {
  const parts = dateTimeParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function zonedDateTimeToUtc(value: string, timeZone: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = desiredUtc;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const visible = dateTimeParts(new Date(candidate), timeZone);
    const visibleAsUtc = Date.UTC(
      visible.year,
      visible.month - 1,
      visible.day,
      visible.hour,
      visible.minute,
      visible.second,
    );
    candidate += desiredUtc - visibleAsUtc;
  }

  const result = new Date(candidate);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function formatObserverDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(date);
}

export function formatUtcOffset(date: Date, timeZone: string) {
  const visible = dateTimeParts(date, timeZone);
  const visibleAsUtc = Date.UTC(
    visible.year,
    visible.month - 1,
    visible.day,
    visible.hour,
    visible.minute,
    visible.second,
  );
  const offsetMinutes = Math.round(
    (visibleAsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000,
  );
  const sign = offsetMinutes >= 0 ? "+" : "−";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
