export type LocalEclipse = {
  kind: "solar" | "lunar";
  type: string;
  maximum: string;
  contacts: Array<{ label: string; at: string }>;
  magnitude: number | null;
};

type LocalEclipseResult = {
  retFlag: number;
  tret: Float64Array;
  attr: Float64Array;
};

type SwissEph = {
  SEFLG_SWIEPH: number;
  SE_ECL_TOTAL: number;
  SE_ECL_ANNULAR: number;
  SE_ECL_ANNULAR_TOTAL: number;
  SE_ECL_PARTIAL: number;
  SE_ECL_PENUMBRAL: number;
  SE_GREG_CAL: number;
  initSwissEph(): Promise<void>;
  revjul(julianDay: number, calendar: number): {
    year: number;
    month: number;
    day: number;
    hour: number;
  };
  sol_eclipse_when_loc(
    julianDay: number,
    flags: number,
    geopos: number[],
    backward: number,
  ): LocalEclipseResult | null;
  lun_eclipse_when_loc(
    julianDay: number,
    flags: number,
    geopos: number[],
    backward: number,
  ): LocalEclipseResult | null;
};

let runtimePromise: Promise<SwissEph> | null = null;

async function getRuntime() {
  runtimePromise ??= import("swisseph-wasm").then(async ({ default: SwissEph }) => {
    const swe = new SwissEph();
    await swe.initSwissEph();
    return swe as unknown as SwissEph;
  });
  return runtimePromise;
}

function julianToIso(swe: SwissEph, julianDay: number) {
  const date = swe.revjul(julianDay, swe.SE_GREG_CAL);
  const wholeHours = Math.floor(date.hour);
  const minutes = Math.round((date.hour - wholeHours) * 60);
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, wholeHours, minutes),
  ).toISOString();
}

function eclipseType(swe: SwissEph, flags: number, kind: LocalEclipse["kind"]) {
  if ((flags & swe.SE_ECL_TOTAL) !== 0) return "Toàn phần";
  if ((flags & swe.SE_ECL_ANNULAR_TOTAL) !== 0) return "Lai (hình khuyên–toàn phần)";
  if (kind === "solar" && (flags & swe.SE_ECL_ANNULAR) !== 0) return "Hình khuyên";
  if (kind === "lunar" && (flags & swe.SE_ECL_PENUMBRAL) !== 0) return "Nửa tối";
  if ((flags & swe.SE_ECL_PARTIAL) !== 0) return "Một phần";
  return "Có thể quan sát";
}

function eventFromResult(
  swe: SwissEph,
  kind: LocalEclipse["kind"],
  result: LocalEclipseResult | null,
): LocalEclipse | null {
  if (!result || result.tret[0] <= 0) return null;
  const contactLabels =
    kind === "solar"
      ? ["Bắt đầu", "Bắt đầu toàn/hình khuyên", "Kết thúc toàn/hình khuyên", "Kết thúc"]
      : ["Bắt đầu một phần", "Kết thúc một phần", "Bắt đầu toàn phần", "Kết thúc toàn phần", "Bắt đầu nửa tối", "Kết thúc nửa tối"];
  const contactIndexes =
    kind === "solar" ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];
  const contacts = contactIndexes.flatMap((index, contactIndex) =>
    result.tret[index] > 0
      ? [{ label: contactLabels[contactIndex], at: julianToIso(swe, result.tret[index]) }]
      : [],
  );
  return {
    kind,
    type: eclipseType(swe, result.retFlag, kind),
    maximum: julianToIso(swe, result.tret[0]),
    contacts,
    magnitude: Number.isFinite(result.attr[0]) ? result.attr[0] : null,
  };
}

export async function findLocalEclipses(
  julianDay: number,
  latitude: number,
  longitude: number,
) {
  const swe = await getRuntime();
  const geopos = [longitude, latitude, 0];
  const flags = swe.SEFLG_SWIEPH;
  const [solar, lunar] = await Promise.all([
    Promise.resolve(swe.sol_eclipse_when_loc(julianDay, flags, geopos, 0)),
    Promise.resolve(swe.lun_eclipse_when_loc(julianDay, flags, geopos, 0)),
  ]);
  return [
    eventFromResult(swe, "solar", solar),
    eventFromResult(swe, "lunar", lunar),
  ].filter((event): event is LocalEclipse => event !== null);
}
