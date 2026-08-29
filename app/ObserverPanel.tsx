"use client";

import {
  formatCoordinates,
  formatUtcOffset,
  OBSERVER_LOCATIONS,
  TIME_ZONES,
  type ObserverLocation,
} from "./observer";

type ObserverPanelProps = {
  date: Date;
  observer: ObserverLocation;
  onChange: (observer: ObserverLocation) => void;
  onUseCurrentLocation: () => void;
  onShare: () => void;
  locationStatus: string;
  shareStatus: string;
};

export function ObserverPanel({
  date,
  observer,
  onChange,
  onUseCurrentLocation,
  onShare,
  locationStatus,
  shareStatus,
}: ObserverPanelProps) {
  const presetSelected = OBSERVER_LOCATIONS.some(
    (location) => location.id === observer.id,
  );
  const timeZoneKnown = TIME_ZONES.some(
    (timeZone) => timeZone === observer.timeZone,
  );

  const updateCoordinate = (
    field: "latitude" | "longitude",
    value: string,
  ) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    onChange({
      ...observer,
      id: "custom",
      name: "Tọa độ tùy chỉnh",
      [field]: parsed,
    });
  };

  return (
    <section className="observer-panel" aria-labelledby="observer-title">
      <div className="panel-heading">
        <div>
          <p>Hồ sơ quan sát</p>
          <h2 id="observer-title">Địa điểm &amp; múi giờ</h2>
        </div>
        <span className="observer-offset">
          {formatUtcOffset(date, observer.timeZone)}
        </span>
      </div>
      <div className="observer-form">
        <label className="observer-place">
          <span>Thành phố</span>
          <select
            value={presetSelected ? observer.id : "custom"}
            onChange={(event) => {
              const next = OBSERVER_LOCATIONS.find(
                (location) => location.id === event.target.value,
              );
              if (next) {
                onChange(next);
              } else {
                onChange({
                  ...observer,
                  id: "custom",
                  name: "Tọa độ tùy chỉnh",
                });
              }
            }}
          >
            {OBSERVER_LOCATIONS.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
            <option value="custom">Tọa độ tùy chỉnh</option>
          </select>
        </label>
        <label>
          <span>Vĩ độ</span>
          <input
            type="number"
            min="-89.9999"
            max="89.9999"
            step="0.0001"
            value={observer.latitude}
            onChange={(event) =>
              updateCoordinate("latitude", event.target.value)
            }
          />
        </label>
        <label>
          <span>Kinh độ</span>
          <input
            type="number"
            min="-180"
            max="180"
            step="0.0001"
            value={observer.longitude}
            onChange={(event) =>
              updateCoordinate("longitude", event.target.value)
            }
          />
        </label>
        <label className="observer-timezone">
          <span>Múi giờ IANA</span>
          <select
            value={observer.timeZone}
            onChange={(event) =>
              onChange({ ...observer, timeZone: event.target.value })
            }
          >
            {!timeZoneKnown ? (
              <option value={observer.timeZone}>{observer.timeZone}</option>
            ) : null}
            {TIME_ZONES.map((timeZone) => (
              <option key={timeZone} value={timeZone}>
                {timeZone}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="observer-summary">
        {observer.name} ·{" "}
        {formatCoordinates(observer.latitude, observer.longitude)}
      </p>
      <div className="observer-actions">
        <button type="button" onClick={onUseCurrentLocation}>
          ◎ Vị trí hiện tại
        </button>
        <button type="button" onClick={onShare}>
          ↗ Sao chép liên kết
        </button>
      </div>
      <p className="observer-status" aria-live="polite">
        {locationStatus || shareStatus || "Dữ liệu chỉ được tính trên thiết bị."}
      </p>
    </section>
  );
}
