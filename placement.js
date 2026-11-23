import { llzToWorldPixel, worldToLatLng, SCALE } from "./utils.js";

export function placeTemplate(template, input) {
  const url = URL.parse(input);
  const coord = (key) => Number(url?.searchParams.get(key)?.trim() || NaN);
  const lat = coord("lat"), lng = coord("lng");
  if (url?.hostname !== "wplace.live" || !["https:", "http:"].includes(url.protocol) ||
      !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) >= 90 || Math.abs(lng) > 180)
    throw Error("緯度・経度を含む wplace URL を入力してください");
  const { worldX, worldY } = llzToWorldPixel(lat, lng);
  const x = Math.floor(worldX), y = Math.floor(worldY);
  const { width, height } = template.image;
  const left = x - Math.floor(width / 2), top = y - Math.floor(height / 2);
  if (left < 0 || top < 0 || left + width > SCALE || top + height > SCALE)
    throw Error("テンプレートが地図の範囲を超えます");
  const nw = worldToLatLng(left, top), se = worldToLatLng(left + width, top + height);
  return { x, y, template: { ...template, bounds: { north: nw.lat, west: nw.lng, south: se.lat, east: se.lng } } };
}
