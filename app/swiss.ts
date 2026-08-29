import { GRAHA_INFO, norm, type Graha } from "./astro";

type SwissModule = typeof import("@swisseph/browser");
type SwissInstance = InstanceType<SwissModule["SwissEphemeris"]>;

type SwissRuntime = {
  module: SwissModule;
  swe: SwissInstance;
  version: string;
};

export type SwissResult = {
  ayanamsa: number;
  grahas: Graha[];
  julianDay: number;
  lagnaLongitude: number;
  mcLongitude: number;
  version: string;
};

let runtimePromise: Promise<SwissRuntime> | null = null;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

async function createRuntime(): Promise<SwissRuntime> {
  const swissModule = await import("@swisseph/browser");
  const swe = new swissModule.SwissEphemeris();
  await swe.init(`${basePath}/swisseph.wasm`);
  await swe.loadEphemerisFiles([
    { name: "sepl_18.se1", url: `${basePath}/ephemeris/sepl_18.se1` },
    { name: "semo_18.se1", url: `${basePath}/ephemeris/semo_18.se1` },
    { name: "seas_18.se1", url: `${basePath}/ephemeris/seas_18.se1` },
  ]);
  swe.setSiderealMode(swissModule.SiderealMode.Lahiri);
  return { module: swissModule, swe, version: swe.version() };
}

function getRuntime() {
  runtimePromise ??= createRuntime();
  return runtimePromise;
}

export async function calculateSwissGrahas(
  date: Date,
  latitude = 10.8231,
  longitude = 106.6297,
): Promise<SwissResult> {
  const { module: swissModule, swe, version } = await getRuntime();
  const julianDay = swe.dateToJulianDay(date);
  const flags =
    swissModule.CalculationFlag.SwissEphemeris |
    swissModule.CalculationFlag.Speed |
    swissModule.CalculationFlag.Sidereal;

  const bodies = {
    sun: swissModule.Planet.Sun,
    moon: swissModule.Planet.Moon,
    mars: swissModule.Planet.Mars,
    mercury: swissModule.Planet.Mercury,
    jupiter: swissModule.Planet.Jupiter,
    venus: swissModule.Planet.Venus,
    saturn: swissModule.Planet.Saturn,
    rahu: swissModule.LunarPoint.MeanNode,
  } as const;

  const positions = Object.fromEntries(
    Object.entries(bodies).map(([id, body]) => [
      id,
      swe.calculatePosition(julianDay, body, flags),
    ]),
  );
  const isSwissEphemeris = Object.values(positions).every(
    (position) =>
      (position.flags & swissModule.CalculationFlag.SwissEphemeris) !== 0,
  );
  if (!isSwissEphemeris) {
    throw new Error("Swiss Ephemeris data files were not used.");
  }

  const ayanamsa = swe.getAyanamsa(julianDay);
  const houses = swe.calculateHouses(
    julianDay,
    latitude,
    longitude,
    swissModule.HouseSystem.WholeSign,
  );
  const lagnaLongitude = norm(houses.ascendant - ayanamsa);
  const mcLongitude = norm(houses.mc - ayanamsa);
  const rahu = positions.rahu;
  const moonDistance = positions.moon.distance;

  const grahas = GRAHA_INFO.map(([id, name, sanskrit, symbol, color]) => {
    const position =
      id === "ketu"
        ? {
            longitude: norm(rahu.longitude + 180),
            latitude: 0,
            distance: moonDistance,
            longitudeSpeed: rahu.longitudeSpeed,
          }
        : id === "rahu"
          ? {
              ...positions.rahu,
              latitude: 0,
              distance: moonDistance,
            }
          : positions[id];

    return {
      id,
      name,
      sanskrit,
      symbol,
      color,
      longitude: norm(position.longitude),
      latitude: position.latitude,
      distance: position.distance,
      tropical: norm(position.longitude + ayanamsa),
      retrograde: position.longitudeSpeed < 0,
      speed: position.longitudeSpeed,
    };
  });

  return {
    ayanamsa,
    grahas,
    julianDay,
    lagnaLongitude,
    mcLongitude,
    version,
  };
}
