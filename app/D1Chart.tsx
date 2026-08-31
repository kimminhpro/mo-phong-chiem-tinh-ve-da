"use client";

import { RASHIS, type Graha } from "./astro";

type D1ChartProps = {
  grahas: Graha[];
  lagnaLongitude: number;
  selected: string;
  onSelect: (id: string) => void;
};

const SOUTH_INDIAN_POSITIONS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 3],
  [2, 3],
  [3, 3],
  [3, 2],
  [3, 1],
  [3, 0],
  [2, 0],
  [1, 0],
  [0, 0],
] as const;

const SHORT_NAMES: Record<string, string> = {
  sun: "Su",
  moon: "Mo",
  mars: "Ma",
  mercury: "Me",
  jupiter: "Ju",
  venus: "Ve",
  saturn: "Sa",
  rahu: "Ra",
  ketu: "Ke",
};

const formatChartDegree = (longitude: number) => {
  const withinSign = ((longitude % 30) + 30) % 30;
  const degrees = Math.floor(withinSign);
  const minutes = Math.floor((withinSign - degrees) * 60);
  return `${String(degrees).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export function D1Chart({
  grahas,
  lagnaLongitude,
  selected,
  onSelect,
}: D1ChartProps) {
  const lagnaSign = Math.floor(lagnaLongitude / 30);

  return (
    <section className="d1-panel d1-main-chart" aria-label="South Indian Chart D1">
      <div className="d1-chart" aria-label="Lá số D1 Whole Sign">
        {RASHIS.map(([sanskrit, vietnamese, symbol], signIndex) => {
          const [row, column] = SOUTH_INDIAN_POSITIONS[signIndex];
          const house = ((signIndex - lagnaSign + 12) % 12) + 1;
          const occupants = grahas
            .filter((graha) => Math.floor(graha.longitude / 30) === signIndex)
            .sort((left, right) => left.longitude - right.longitude);
          return (
            <div
              className={`d1-sign ${signIndex === lagnaSign ? "lagna-sign" : ""}`}
              key={sanskrit}
              style={{ gridRow: row + 1, gridColumn: column + 1 }}
            >
              <div className="d1-sign-head">
                <span>
                  {symbol} {vietnamese}
                </span>
                <b>H{house}</b>
              </div>
              {signIndex === lagnaSign ? (
                <span className="lagna-chip">Lg</span>
              ) : null}
              <div className="d1-grahas">
                {occupants.map((graha) => (
                  <button
                    type="button"
                    key={graha.id}
                    className={selected === graha.id ? "active" : ""}
                    style={{ color: graha.color }}
                    onClick={() => onSelect(graha.id)}
                    title={`${graha.name} · ${formatChartDegree(graha.longitude)} ${vietnamese}`}
                  >
                    <span>{SHORT_NAMES[graha.id]}</span>
                    <small>
                      {formatChartDegree(graha.longitude)}
                      {graha.retrograde ? " R" : ""}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="d1-center">
          <span>D1</span>
          <strong>Whole Sign</strong>
          <small>Lahiri</small>
        </div>
      </div>
    </section>
  );
}
