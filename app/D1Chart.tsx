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

export function D1Chart({
  grahas,
  lagnaLongitude,
  selected,
  onSelect,
}: D1ChartProps) {
  const lagnaSign = Math.floor(lagnaLongitude / 30);

  return (
    <section className="d1-panel" aria-labelledby="d1-title">
      <div className="panel-heading">
        <div>
          <p>Lá số Rāśi</p>
          <h2 id="d1-title">D1 · Nam Ấn</h2>
        </div>
        <span className="whole-sign-badge">Whole Sign</span>
      </div>
      <div className="d1-chart" aria-label="Lá số D1 Whole Sign">
        {RASHIS.map(([sanskrit, vietnamese, symbol], signIndex) => {
          const [row, column] = SOUTH_INDIAN_POSITIONS[signIndex];
          const house = ((signIndex - lagnaSign + 12) % 12) + 1;
          const occupants = grahas.filter(
            (graha) => Math.floor(graha.longitude / 30) === signIndex,
          );
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
                    title={`${graha.name} · ${vietnamese}`}
                  >
                    {SHORT_NAMES[graha.id]}
                    {graha.retrograde ? "℞" : ""}
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
      <p className="d1-note">
        Mỗi rāśi là một bhāva trọn vẹn; H1 bắt đầu tại cung chứa Lagna.
      </p>
    </section>
  );
}
