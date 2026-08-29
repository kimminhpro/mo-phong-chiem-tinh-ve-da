export type Graha = {
  id: string;
  name: string;
  sanskrit: string;
  symbol: string;
  color: string;
  longitude: number;
  latitude: number;
  distance: number;
  tropical: number;
  retrograde: boolean;
  speed: number;
};

export type MoonPhase = {
  elongation: number;
  illumination: number;
  tithi: number;
  paksha: "Shukla" | "Krishna";
  tithiName: string;
  phaseName: string;
};

export type EclipseState = {
  kind: "solar" | "lunar" | null;
  syzygyDistance: number;
  nodeDistance: number;
  description: string;
};

export const RASHIS = [
  ["Mesha", "Bạch Dương", "♈︎"],
  ["Vrishabha", "Kim Ngưu", "♉︎"],
  ["Mithuna", "Song Tử", "♊︎"],
  ["Karka", "Cự Giải", "♋︎"],
  ["Simha", "Sư Tử", "♌︎"],
  ["Kanya", "Xử Nữ", "♍︎"],
  ["Tula", "Thiên Bình", "♎︎"],
  ["Vrischika", "Bọ Cạp", "♏︎"],
  ["Dhanu", "Nhân Mã", "♐︎"],
  ["Makara", "Ma Kết", "♑︎"],
  ["Kumbha", "Bảo Bình", "♒︎"],
  ["Meena", "Song Ngư", "♓︎"],
] as const;

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const ROMAN_HOUSES = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const;

export const GRAHA_INFO = [
  ["sun", "Mặt Trời", "Surya", "☉", "#f1b957"],
  ["moon", "Mặt Trăng", "Chandra", "●", "#d9e2e8"],
  ["mars", "Hỏa", "Mangala", "♂", "#e56b51"],
  ["mercury", "Thủy", "Budha", "☿", "#7fb7b2"],
  ["jupiter", "Mộc", "Guru", "♃", "#c8a86a"],
  ["venus", "Kim", "Shukra", "♀", "#e9c7a1"],
  ["saturn", "Thổ", "Shani", "♄", "#8795b5"],
  ["rahu", "Rahu", "Bắc giao điểm", "☊", "#9db68c"],
  ["ketu", "Ketu", "Nam giao điểm", "☋", "#b58b76"],
] as const;

export const norm = (value: number) => ((value % 360) + 360) % 360;

const TITHI_NAMES = [
  "Pratipada",
  "Dvitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dvadashi",
  "Trayodashi",
  "Chaturdashi",
] as const;

export function getMoonPhase(grahas: Graha[]): MoonPhase | null {
  const sun = grahas.find((graha) => graha.id === "sun");
  const moon = grahas.find((graha) => graha.id === "moon");
  if (!sun || !moon) return null;

  const elongation = norm(moon.tropical - sun.tropical);
  const illumination = (1 - Math.cos((elongation * Math.PI) / 180)) / 2;
  const tithi = Math.min(30, Math.floor(elongation / 12) + 1);
  const paksha = tithi <= 15 ? "Shukla" : "Krishna";
  const tithiName =
    tithi === 15
      ? "Purnima"
      : tithi === 30
        ? "Amavasya"
        : TITHI_NAMES[(tithi - 1) % 15];
  const phaseName =
    elongation < 22.5 || elongation >= 337.5
      ? "New Moon · Trăng non"
      : elongation < 67.5
        ? "Waxing Crescent · Trăng lưỡi liềm đầu tháng"
        : elongation < 112.5
          ? "First Quarter · Thượng huyền"
          : elongation < 157.5
            ? "Waxing Gibbous · Trăng khuyết dần sáng"
            : elongation < 202.5
              ? "Full Moon · Trăng tròn"
              : elongation < 247.5
                ? "Waning Gibbous · Trăng khuyết dần tối"
                : elongation < 292.5
                  ? "Third Quarter · Hạ huyền"
                  : "Waning Crescent · Trăng lưỡi liềm cuối tháng";

  return { elongation, illumination, tithi, paksha, tithiName, phaseName };
}

const angularDistance = (first: number, second: number) =>
  Math.abs(norm(first - second + 180) - 180);

export function getEclipseState(grahas: Graha[]): EclipseState | null {
  const sun = grahas.find((graha) => graha.id === "sun");
  const moon = grahas.find((graha) => graha.id === "moon");
  const rahu = grahas.find((graha) => graha.id === "rahu");
  if (!sun || !moon || !rahu) return null;

  const elongation = norm(moon.tropical - sun.tropical);
  const solarDistance = Math.min(elongation, 360 - elongation);
  const lunarDistance = Math.abs(elongation - 180);
  const nodeDistance = Math.min(
    angularDistance(moon.longitude, rahu.longitude),
    angularDistance(moon.longitude, norm(rahu.longitude + 180)),
  );
  const nearNode = nodeDistance <= 18;

  if (nearNode && solarDistance <= 12) {
    return {
      kind: "solar",
      syzygyDistance: solarDistance,
      nodeDistance,
      description: "Nhật thực · Mặt Trời — Moon — Trái Đất thẳng hàng gần nút",
    };
  }
  if (nearNode && lunarDistance <= 12) {
    return {
      kind: "lunar",
      syzygyDistance: lunarDistance,
      nodeDistance,
      description: "Nguyệt thực · Mặt Trời — Trái Đất — Moon thẳng hàng gần nút",
    };
  }
  return {
    kind: null,
    syzygyDistance: Math.min(solarDistance, lunarDistance),
    nodeDistance,
    description: "Không ở cửa sổ thực: Moon cần gần New Moon/Full Moon và gần Rahu hoặc Ketu.",
  };
}

export function formatDegree(longitude: number) {
  const within = norm(longitude) % 30;
  const deg = Math.floor(within);
  const minFloat = (within - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.floor((minFloat - min) * 60);
  return `${String(deg).padStart(2, "0")}° ${String(min).padStart(2, "0")}′ ${String(sec).padStart(2, "0")}″`;
}

export function getNakshatra(longitude: number) {
  const segment = 360 / 27;
  const index = Math.floor(norm(longitude) / segment);
  const within = norm(longitude) - index * segment;
  const pada = Math.min(4, Math.floor(within / (segment / 4)) + 1);
  return {
    index,
    name: NAKSHATRAS[index],
    pada,
    progress: within / segment,
  };
}
