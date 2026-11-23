import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { generateRoad } from "../road.js";
import { parseTemplate, LIMIT } from "../template.js";
import { planPolylineWorld, buildDebugText, toWplaceURL } from "../utils.js";
const center = "https://wplace.live/?lat=0&lng=0";
test("vertical and identical endpoints", () => {
  for (const y of [12, 0]) {
    const p = planPolylineWorld({ x: 0, y: 0 }, { x: 0, y });
    assert.equal(p.bend, null);
    assert.equal(p.polylineLocal[1].y, y);
    assert.match(buildDebugText(p), /—/);
  }
});
test("native indexed PNG and exact UTF-8 limit", () => {
  const t = generateRoad({ kind: "circle", center, radius: 20 });
  const b = Buffer.from(t.image.dataUrl.split(",")[1], "base64");
  assert.equal(b.readUInt32BE(16), 45);
  let at = 8;
  while (b.toString("ascii", at + 4, at + 8) !== "IDAT")
    at += 12 + b.readUInt32BE(at);
  const rows = inflateSync(b.subarray(at + 8, at + 8 + b.readUInt32BE(at)));
  assert.equal(rows[22 * 46 + 23], 0);
  assert.ok(rows.includes(2));
  for(let y=0;y<45;y++)for(let x=0;x<45;x++){
    assert.equal(rows[y*46+1+x],rows[y*46+45-x]);
    assert.equal(rows[y*46+1+x],rows[x*46+1+y]);
  }
  assert.notEqual(generateRoad({kind:"circle",center,radius:20,overlap:0}).image.dataUrl,t.image.dataUrl);
  const json = JSON.stringify(t),
    text = json + " ".repeat(LIMIT - Buffer.byteLength(json));
  assert.equal(parseTemplate(text).name, t.name);
  assert.throws(() => parseTemplate(text + " "));
});
test("clothoid placement and impossible radius", () => {
  const p = {
    kind: "clothoid",
    start: toWplaceURL(10000, 10000),
    intersection: toWplaceURL(10200, 10000),
    end: toWplaceURL(10200, 10200),
    radius: 50,
    length: 20,
  };
  assert.ok(generateRoad(p).image.width >= 200);
  assert.throws(() => generateRoad({ ...p, radius: 1000 }));
});
