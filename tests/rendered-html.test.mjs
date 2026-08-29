import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("exports a static Jyotish Orbit site", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Jyotish Orbit — Bầu trời Vệ Đà<\/title>/i);
  await Promise.all([
    access(new URL("../out/swisseph.wasm", import.meta.url)),
    access(new URL("../out/ephemeris/sepl_18.se1", import.meta.url)),
    access(new URL("../out/ephemeris/semo_18.se1", import.meta.url)),
    access(new URL("../out/ephemeris/seas_18.se1", import.meta.url)),
  ]);
});
