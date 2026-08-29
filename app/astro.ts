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
