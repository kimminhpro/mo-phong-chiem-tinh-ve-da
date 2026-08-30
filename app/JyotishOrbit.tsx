"use client";

import { useEffect, useState } from "react";
import {
  formatDegree,
  getMoonPhase,
  getNakshatra,
  NAKSHATRAS,
  RASHIS,
  type Graha,
} from "./astro";
import { calculateSwissGrahas } from "./swiss";
import { ThreeSky } from "./ThreeSky";
import { D1Chart } from "./D1Chart";
import { ObserverPanel } from "./ObserverPanel";
import {
  DEFAULT_OBSERVER,
  formatDateTimeInput,
  formatObserverDate,
  formatUtcOffset,
  zonedDateTimeToUtc,
  type ObserverLocation,
} from "./observer";

const SPEEDS = [
  { label: "1 giờ / giây", value: 1 / 24 },
  { label: "1 ngày / giây", value: 1 },
  { label: "7 ngày / giây", value: 7 },
  { label: "30 ngày / giây", value: 30 },
];
const formatLatitude = (latitude: number) =>
  `${latitude >= 0 ? "+" : "−"}${Math.abs(latitude).toFixed(3)}°`;

const formatDistance = (distance: number) =>
  `${distance < 0.01 ? distance.toFixed(6) : distance.toFixed(4)} AU`;

function PositionList({
  grahas,
  selected,
  onSelect,
}: {
  grahas: Graha[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="positions" aria-labelledby="positions-title">
      <div className="panel-heading">
        <div>
          <p>Navagraha</p>
          <h2 id="positions-title">Vị trí Graha</h2>
        </div>
        <span>Sidereal</span>
      </div>
      <div className="position-head">
        <span>Graha</span>
        <span>Kinh độ / β / AU</span>
        <span>Rāśi / Nakshatra</span>
      </div>
      <div className="position-list">
        {grahas.length === 0 && (
          <div className="position-loading">Đang tính vị trí Navagraha…</div>
        )}
        {grahas.map((graha) => {
          const rashi = RASHIS[Math.floor(graha.longitude / 30)];
          const nakshatra = getNakshatra(graha.longitude);
          return (
            <button
              type="button"
              className={`position-row ${selected === graha.id ? "active" : ""}`}
              key={graha.id}
              onClick={() => onSelect(graha.id)}
            >
              <span className="graha-name">
                <i style={{ color: graha.color }}>{graha.symbol}</i>
                <span>
                  <strong>{graha.name}</strong>
                  <small>{graha.sanskrit}</small>
                </span>
              </span>
              <span className="degree">
                <span>
                  {formatDegree(graha.longitude)}
                  {graha.retrograde && <em>℞</em>}
                </span>
                <small>
                  {graha.id === "rahu" || graha.id === "ketu"
                    ? "Giao điểm · β 0°"
                    : `β ${formatLatitude(graha.latitude)} · ${formatDistance(graha.distance)}`}
                </small>
              </span>
              <span className="rashi-name">
                <b>{rashi[2]}</b>
                <span className="rashi-stack">
                  <strong>{rashi[1]}</strong>
                  <small>
                    {nakshatra.name} · P{nakshatra.pada}
                  </small>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MoonPhaseCard({ grahas }: { grahas: Graha[] }) {
  const phase = getMoonPhase(grahas);
  if (!phase) return null;
  return (
    <section className="moon-phase" aria-labelledby="moon-phase-title">
      <div>
        <p>Panchanga · Tithi</p>
        <h2 id="moon-phase-title">Pha Mặt Trăng</h2>
      </div>
      <strong>{Math.round(phase.illumination * 100)}%</strong>
      <p>
        {phase.paksha} {phase.tithiName} · Tithi {phase.tithi}
      </p>
      <small>{phase.phaseName} · góc Mặt Trời–Mặt Trăng {phase.elongation.toFixed(1)}°</small>
    </section>
  );
}

export function JyotishOrbit({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(() => new Date(initialDate));
  const [observer, setObserver] =
    useState<ObserverLocation>(DEFAULT_OBSERVER);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState("sun");
  const [showLabels, setShowLabels] = useState(false);
  const [showNakshatras, setShowNakshatras] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "d1">("3d");
  const [grahas, setGrahas] = useState<Graha[]>([]);
  const [ayanamsa, setAyanamsa] = useState<number | null>(null);
  const [lagnaLongitude, setLagnaLongitude] = useState(0);
  const [mcLongitude, setMcLongitude] = useState(0);
  const [julianDay, setJulianDay] = useState<number | null>(null);
  const [engineVersion, setEngineVersion] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [engineStatus, setEngineStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const sharedDate = params.get("t");
      const latitude = Number(params.get("lat"));
      const longitude = Number(params.get("lon"));
      const timeZone = params.get("tz");
      const name = params.get("place");

      let restoredSharedDate = false;
      if (sharedDate) {
        const parsed = new Date(sharedDate);
        if (!Number.isNaN(parsed.getTime())) {
          setDate(parsed);
          restoredSharedDate = true;
        }
      }
      if (
        Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180 &&
        timeZone
      ) {
        try {
          new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
          setObserver({
            id: "shared",
            name: name || "Địa điểm được chia sẻ",
            latitude,
            longitude,
            timeZone,
          });
        } catch {
          // Ignore invalid IANA zones from edited URLs.
        }
      }
      if (!restoredSharedDate) setDate(new Date());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setDate(
        (current) => new Date(current.getTime() + (speed * 86400000) / 10),
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    let cancelled = false;
    calculateSwissGrahas(date, observer.latitude, observer.longitude)
      .then((result) => {
        if (cancelled) return;
        setGrahas(result.grahas);
        setAyanamsa(result.ayanamsa);
        setLagnaLongitude(result.lagnaLongitude);
        setMcLongitude(result.mcLongitude);
        setJulianDay(result.julianDay);
        setEngineVersion(result.version);
        setEngineStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setEngineStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [date, observer.latitude, observer.longitude]);

  const chosen = grahas.find((graha) => graha.id === selected) ?? null;
  const chosenRashi = chosen
    ? RASHIS[Math.floor(chosen.longitude / 30)]
    : null;
  const chosenNakshatra = chosen ? getNakshatra(chosen.longitude) : null;
  const lagnaSignIndex = Math.floor(lagnaLongitude / 30);
  const lagnaRashi = RASHIS[lagnaSignIndex];
  const chosenHouse = chosen
    ? ((Math.floor(chosen.longitude / 30) - lagnaSignIndex + 12) % 12) + 1
    : null;

  const shiftDays = (days: number) =>
    setDate((current) => new Date(current.getTime() + days * 86400000));

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Trình duyệt này không hỗ trợ định vị.");
      return;
    }
    setLocationStatus("Đang xác định vị trí…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setObserver({
          id: "current",
          name: "Vị trí hiện tại",
          latitude: Math.round(coords.latitude * 10000) / 10000,
          longitude: Math.round(coords.longitude * 10000) / 10000,
          timeZone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            observer.timeZone,
        });
        setLocationStatus("Đã cập nhật vị trí và múi giờ của thiết bị.");
      },
      () => {
        setLocationStatus(
          "Không thể đọc vị trí. Anh có thể nhập tọa độ thủ công.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const shareCurrentView = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("t", date.toISOString());
    url.searchParams.set("lat", String(observer.latitude));
    url.searchParams.set("lon", String(observer.longitude));
    url.searchParams.set("tz", observer.timeZone);
    url.searchParams.set("place", observer.name);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Đã sao chép liên kết thời gian và địa điểm.");
    } catch {
      window.history.replaceState({}, "", url);
      setShareStatus("Liên kết đã được đặt trên thanh địa chỉ.");
    }
  };

  return (
    <main className={showLabels ? "" : "labels-hidden"}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Jyotish Orbit">
          <span className="brand-mark">✺</span>
          <span>
            <strong>Jyotish Orbit</strong>
            <small>Bầu trời Vệ Đà</small>
          </span>
        </a>
        <div className="top-actions">
          <button
            className="now-button"
            type="button"
            onClick={() => setDate(new Date())}
          >
            <span>◷</span> Hiện tại
          </button>
          <button
            className="play-button"
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-pressed={playing}
            disabled={engineStatus !== "ready"}
          >
            <span>{playing ? "Ⅱ" : "▶"}</span>
            {playing ? "Tạm dừng" : "Mô phỏng"}
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="sky">
          <div className="sky-heading">
            <div>
              <p>
                {engineStatus === "error"
                  ? "Không thể nạp Swiss Ephemeris"
                  : engineStatus === "ready"
                    ? `Swiss Ephemeris ${engineVersion} · Sidereal Lahiri`
                    : "Đang nạp Swiss Ephemeris · Sidereal Lahiri"}
              </p>
              <h1>
                Bầu trời vào {formatObserverDate(date, observer.timeZone)}
              </h1>
              <span className="sky-location">
                ◎ {observer.name} · Lagna {lagnaRashi[2]} {lagnaRashi[1]} ·
                Whole Sign
              </span>
            </div>
            <div className="view-toggles">
              <div className="view-mode" aria-label="Chế độ hiển thị">
                <button
                  className={viewMode === "3d" ? "active" : ""}
                  type="button"
                  onClick={() => setViewMode("3d")}
                  aria-pressed={viewMode === "3d"}
                >
                  Thiên văn 3D
                </button>
                <button
                  className={viewMode === "d1" ? "active" : ""}
                  type="button"
                  onClick={() => setViewMode("d1")}
                  aria-pressed={viewMode === "d1"}
                >
                  Lá số Rāśi D1
                </button>
              </div>
              <button
                className={`label-toggle ${showNakshatras ? "active" : ""}`}
                type="button"
                onClick={() => setShowNakshatras((value) => !value)}
              >
                {showNakshatras ? "Ẩn Nakshatra" : "Hiện Nakshatra"}
              </button>
              <button
                className={`label-toggle ${showLabels ? "active" : ""}`}
                type="button"
                onClick={() => setShowLabels((value) => !value)}
              >
                {showLabels ? "Ẩn tên Graha" : "Hiện tên Graha"}
              </button>
            </div>
          </div>
          {viewMode === "3d" && grahas.length > 0 ? (
            <ThreeSky
              grahas={grahas}
              lagnaLongitude={lagnaLongitude}
              selected={selected}
              showLabels={showLabels}
              showNakshatras={showNakshatras}
              onSelect={setSelected}
              onUnavailable={() => setViewMode("d1")}
            />
          ) : (
            <D1Chart
              grahas={grahas}
              lagnaLongitude={lagnaLongitude}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {chosen && chosenRashi && chosenNakshatra ? (
            <div className="selection-readout">
              <span
                className="selection-symbol"
                style={{ color: chosen.color }}
              >
                {chosen.symbol}
              </span>
              <div>
                <small>{chosen.sanskrit}</small>
                <strong>{chosen.name}</strong>
              </div>
              <div>
                <small>Kinh độ</small>
                <strong>{formatDegree(chosen.longitude)}</strong>
              </div>
              <div>
                <small>Rāśi</small>
                <strong>
                  {chosenRashi[2]} {chosenRashi[1]}
                </strong>
              </div>
              <div>
                <small>Bhāva · Whole Sign</small>
                <strong>H{chosenHouse}</strong>
              </div>
              <div>
                <small>Nakshatra</small>
                <strong>
                  {chosenNakshatra.name} · Pāda {chosenNakshatra.pada}
                </strong>
              </div>
              <div>
                <small>
                  {chosen.id === "rahu" || chosen.id === "ketu"
                    ? "Giao điểm"
                    : "Vĩ độ · khoảng cách"}
                </small>
                <strong>
                  {chosen.id === "rahu" || chosen.id === "ketu"
                    ? chosen.id === "rahu"
                      ? "Nút Bắc · quỹ đạo Moon đi lên qua hoàng đạo"
                      : "Nút Nam · quỹ đạo Moon đi xuống qua hoàng đạo"
                    : `β ${formatLatitude(chosen.latitude)} · ${formatDistance(chosen.distance)}`}
                </strong>
              </div>
              <div className="movement-readout">
                <small>Chuyển động</small>
                <strong>
                  {chosen.retrograde ? "Nghịch hành ℞" : "Thuận hành"} ·{" "}
                  {chosen.speed.toFixed(4)}°/ngày
                </strong>
              </div>
            </div>
          ) : (
            <div className="selection-readout selection-loading">
              Đang khởi tạo bộ tính toán độ chính xác cao…
            </div>
          )}
        </section>

        <aside>
          <ObserverPanel
            date={date}
            observer={observer}
            onChange={(next) => {
              setObserver(next);
              setLocationStatus("");
            }}
            onUseCurrentLocation={useCurrentLocation}
            onShare={shareCurrentView}
            locationStatus={locationStatus}
            shareStatus={shareStatus}
          />
          <MoonPhaseCard grahas={grahas} />
          <PositionList
            grahas={grahas}
            selected={selected}
            onSelect={setSelected}
          />
          <section className="method-note">
            <div className="compass">✺</div>
            <div>
              <h3>Địa tâm · Whole Sign</h3>
              <p>
                Kinh độ, vĩ độ hoàng đạo và khoảng cách địa tâm được Swiss
                Ephemeris tính trực tiếp; cảnh 3D dùng thang khoảng cách
                logarithm trong hệ sidereal Lahiri
                {ayanamsa !== null
                  ? `, ayanāṃśa ${ayanamsa.toFixed(4)}°`
                  : ""}
                . Lagna được tính tại {observer.name}; mỗi rāśi từ 0° đến 30°
                tạo thành một bhāva trọn vẹn.
              </p>
              <small>
                JD {julianDay?.toFixed(5) ?? "—"} · MC sidereal{" "}
                {formatDegree(mcLongitude)} · Rahu dùng Mean Node ·{" "}
                <a
                  href="https://www.astro.com/swisseph/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Swiss Ephemeris
                </a>{" "}
                AGPL-3.0.
              </small>
            </div>
          </section>
          <details className="nakshatra-catalog">
            <summary>Danh mục 27 Nakshatra</summary>
            <ol>
              {NAKSHATRAS.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
          </details>
        </aside>
      </div>

      <section className="time-dock" aria-label="Điều khiển thời gian">
        <button
          type="button"
          className="step-button"
          onClick={() => shiftDays(-1)}
          aria-label="Lùi một ngày"
        >
          ‹
        </button>
        <div className="date-control">
          <label htmlFor="sky-date">
            Ngày &amp; giờ · {formatUtcOffset(date, observer.timeZone)}
          </label>
          <input
            id="sky-date"
            type="datetime-local"
            value={formatDateTimeInput(date, observer.timeZone)}
            onChange={(event) => {
              const next = zonedDateTimeToUtc(
                event.target.value,
                observer.timeZone,
              );
              if (next) setDate(next);
            }}
          />
        </div>
        <div className="timeline">
          <div className="timeline-track">
            {Array.from({ length: 13 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="timeline-labels">
            <span>-6 tháng</span>
            <span>Hiện tại</span>
            <span>+6 tháng</span>
          </div>
        </div>
        <div className="speed-control">
          <label htmlFor="speed">Tốc độ</label>
          <select
            id="speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            {SPEEDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="step-button"
          onClick={() => shiftDays(1)}
          aria-label="Tiến một ngày"
        >
          ›
        </button>
      </section>
    </main>
  );
}
