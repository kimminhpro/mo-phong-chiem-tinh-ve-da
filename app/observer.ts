export type ObserverLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

export const OBSERVER_LOCATIONS: ObserverLocation[] = [
  {
    id: "ho-chi-minh",
    name: "TP. Hồ Chí Minh",
    latitude: 10.8231,
    longitude: 106.6297,
    timeZone: "Asia/Ho_Chi_Minh",
  },
  {
    id: "ha-noi",
    name: "Hà Nội",
    latitude: 21.0285,
    longitude: 105.8542,
    timeZone: "Asia/Ho_Chi_Minh",
  },
  {
    id: "da-nang",
    name: "Đà Nẵng",
    latitude: 16.0544,
    longitude: 108.2022,
    timeZone: "Asia/Ho_Chi_Minh",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    timeZone: "Asia/Tokyo",
  },
  {
    id: "new-delhi",
    name: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timeZone: "Asia/Kolkata",
  },
  {
    id: "london",
    name: "London",
    latitude: 51.5072,
    longitude: -0.1276,
    timeZone: "Europe/London",
  },
  {
    id: "new-york",
    name: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York",
  },
];

export const DEFAULT_OBSERVER = OBSERVER_LOCATIONS[0];

export const TIME_ZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
] as const;

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

export function formatCoordinates(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "B" : "N"}`;
  const lon = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "Đ" : "T"}`;
  return `${lat} · ${lon}`;
}
