import test from "node:test";
import assert from "node:assert/strict";
import { placeTemplate } from "../placement.js";
import { toWplaceURL, worldToLatLng } from "../utils.js";

test("97px template is centered on the selected pixel without changing the original", () => {
  const original = { image: { width: 97, height: 97 }, bounds: {} };
  const { template, x, y } = placeTemplate(original, toWplaceURL(1798150.5, 905259.5));
  assert.deepEqual([x, y], [1798150, 905259]);
  const nw = worldToLatLng(x - 48, y - 48), se = worldToLatLng(x + 49, y + 49);
  assert.deepEqual(template.bounds, { north: nw.lat, west: nw.lng, south: se.lat, east: se.lng });
  assert.equal(template.image, original.image);
  assert.deepEqual(original.bounds, {});
  assert.throws(() => placeTemplate(original, toWplaceURL(1, 1)));
  assert.throws(() => placeTemplate(original, "https://wplace.live/"));
});
