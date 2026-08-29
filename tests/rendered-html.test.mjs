import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Jyotish Orbit application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Jyotish Orbit — Bầu trời Vệ Đà<\/title>/i);
  assert.match(html, /Swiss Ephemeris/);
  assert.match(html, /Thiên văn 3D/);
  assert.match(html, /Danh mục 27 Nakshatra/);
  assert.match(html, /Địa điểm &amp; múi giờ/);
  assert.match(html, /D1 · Nam Ấn/);
  assert.match(html, /Whole Sign/);
  assert.match(html, /Sao chép liên kết/);
  assert.doesNotMatch(html, /Sripati|codex-preview|Your site is taking shape/i);
});

test("keeps the Whole Sign astronomical model explicit in source", async () => {
  const [threeSky, zodiacWheel, astro, swiss, observer, d1Chart, hosting] =
    await Promise.all([
      readFile(new URL("../app/ThreeSky.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/JyotishOrbit.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/astro.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/swiss.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/observer.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/D1Chart.tsx", import.meta.url), "utf8"),
      readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    ]);

  assert.match(astro, /export const RASHIS/);
  assert.match(astro, /export const NAKSHATRAS/);
  assert.match(astro, /export const ROMAN_HOUSES/);
  assert.match(threeSky, /Rāśi · 12 ký hiệu/);
  assert.match(threeSky, /Nakshatra · 27 × 13°20′/);
  assert.match(threeSky, /Pāda · 108 × 3°20′/);
  assert.match(threeSky, /Bhāva · I–XII · Whole Sign/);
  assert.match(threeSky, /createCoordinateLabel\(name, "", \{/);
  assert.doesNotMatch(threeSky, /createCoordinateLabel\(String\(index \+ 1\)/);
  const rashiInner = Number(
    threeSky.match(/const RASHI_RING_INNER = ([\d.]+);/)?.[1],
  );
  const rashiOuter = Number(
    threeSky.match(/const RASHI_RING_OUTER = ([\d.]+);/)?.[1],
  );
  const nakshatraInner = Number(
    threeSky.match(/const NAKSHATRA_RING_INNER = ([\d.]+);/)?.[1],
  );
  const nakshatraOuter = Number(
    threeSky.match(/const NAKSHATRA_RING_OUTER = ([\d.]+);/)?.[1],
  );
  const padaInner = Number(
    threeSky.match(/const PADA_RING_INNER = ([\d.]+);/)?.[1],
  );
  const padaOuter = Number(
    threeSky.match(/const PADA_RING_OUTER = ([\d.]+);/)?.[1],
  );
  const houseInner = Number(
    threeSky.match(/const HOUSE_RING_INNER = ([\d.]+);/)?.[1],
  );
  const houseOuter = Number(
    threeSky.match(/const HOUSE_RING_OUTER = ([\d.]+);/)?.[1],
  );
  const almostEqual = (left, right) => Math.abs(left - right) < 1e-9;
  assert.ok(
    nakshatraOuter - nakshatraInner < rashiOuter - rashiInner,
    "Nakshatra ring must be visibly thinner than the zodiac ring",
  );
  assert.ok(
    padaOuter - padaInner < nakshatraOuter - nakshatraInner,
    "Pada ring must be thinner than the Nakshatra ring",
  );
  assert.ok(almostEqual(houseOuter, rashiInner));
  assert.ok(almostEqual(rashiOuter, nakshatraInner));
  assert.ok(almostEqual(nakshatraOuter, padaInner));
  assert.ok(houseInner > 5, "The expanded inner astronomy field must remain");
  assert.match(
    threeSky,
    /new THREE\.RingGeometry\(PADA_RING_INNER, PADA_RING_OUTER, 216\)/,
  );
  assert.match(threeSky, /SCENE_RADIUS_MAX = 4\.72/);
  assert.match(threeSky, /index < 108/);
  assert.match(threeSky, /index === 0 \? "I · ASC" : roman/);
  assert.doesNotMatch(threeSky, /lagnaRay|lagnaMarker/);
  assert.match(swiss, /SiderealMode\.Lahiri/);
  assert.match(swiss, /HouseSystem\.WholeSign/);
  assert.doesNotMatch(swiss, /HouseSystem\.Sripati/);
  assert.match(observer, /zonedDateTimeToUtc/);
  assert.match(observer, /Asia\/Ho_Chi_Minh/);
  assert.match(zodiacWheel, /H\{houseIndex \+ 1\}/);
  assert.match(zodiacWheel, /\* 42/);
  assert.match(d1Chart, /D1 · Nam Ấn/);
  assert.match(d1Chart, /Mỗi rāśi là một bhāva trọn vẹn/);
  assert.match(hosting, /"project_id":\s*"appgprj_/);
});
