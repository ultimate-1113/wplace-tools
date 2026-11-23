import { zlibSync } from "fflate";
import {
  parseWplaceURL,
  llzToWorldPixel,
  worldToLatLng,
  SCALE,
} from "./utils.js";
import { palette } from "./palette.js";

const TAU = 2 * Math.PI;
const MAX_LENGTH = 32000;
function number(v, min, max, label) {
  if (!Number.isFinite(v) || v < min || v > max)
    throw Error(label + "の範囲を確認してください");
  return v;
}
function point(url) {
  const { lat, lng } = parseWplaceURL(url);
  const { worldX, worldY } = llzToWorldPixel(lat, lng);
  return {
    x: Math.floor(number(worldX, 0, SCALE, "経度")),
    y: Math.floor(number(worldY, 0, SCALE - 1, "緯度")),
  };
}
function line(points, a, b) {
  const steps = Math.ceil(2 * Math.hypot(b.x - a.x, b.y - a.y));
  if (steps > 2 * MAX_LENGTH) throw Error("作図区間を短くしてください");
  for (let i = 1; i <= steps; i++)
    points.push({
      x: a.x + ((b.x - a.x) * i) / steps,
      y: a.y + ((b.y - a.y) * i) / steps,
    });
}
function transition(params, r) {
  const [a, p, b] = [params.start, params.intersection, params.end].map(point);
  const incoming = Math.atan2(p.y - a.y, p.x - a.x),
    outgoing = Math.atan2(b.y - p.y, b.x - p.x);
  const turn = Math.atan2(
    Math.sin(outgoing - incoming),
    Math.cos(outgoing - incoming),
  );
  const angle = Math.abs(turn),
    sign = Math.sign(turn);
  const L = number(params.length, 0.5, MAX_LENGTH, "緩和区間長");
  const arc = r * angle - L;
  if (arc < 0 || angle > Math.PI - 1e-6)
    throw Error("緩和区間長を短くするか、交点の位置を調整してください");
  const total = 2 * L + arc,
    steps = Math.ceil(total * 2);
  if (total > MAX_LENGTH) throw Error("曲線を短くしてください");
  // Integrate the tangent at each half step; curvature increases linearly, then mirrors on exit.
  let x = 0,
    y = 0;
  const local = [{ x, y }];
  for (let i = 0; i < steps; i++) {
    const s = ((i + 0.5) * total) / steps;
    const heading =
      s < L
        ? (s * s) / (2 * r * L)
        : s <= L + arc
          ? (s - L / 2) / r
          : angle - (total - s) ** 2 / (2 * r * L);
    x += (Math.cos(heading) * total) / steps;
    y += (Math.sin(sign * heading) * total) / steps;
    local.push({ x, y });
  }
  const setback = Math.hypot(x, y) / (2 * Math.cos(angle / 2));
  if (
    setback >
    Math.min(Math.hypot(p.x - a.x, p.y - a.y), Math.hypot(b.x - p.x, b.y - p.y))
  )
    throw Error("半径か緩和区間長を小さくしてください");
  const c = Math.cos(incoming),
    s = Math.sin(incoming);
  const start = { x: p.x - setback * c, y: p.y - setback * s },
    points = [a];
  line(points, a, start);
  for (const q of local)
    points.push({
      x: start.x + q.x * c - q.y * s,
      y: start.y + q.x * s + q.y * c,
    });
  line(points, points.at(-1), b);
  return points;
}
function centerline(p) {
  const r = number(p.radius, 1, MAX_LENGTH, "半径");
  if (p.kind === "clothoid") return transition(p, r);
  if (!["circle", "arc"].includes(p.kind))
    throw Error("図形を指定してください");
  const center = point(p.center);
  const start =
    p.kind === "circle" ? 0 : number(p.startAngle, 0, 360, "開始角");
  const end = p.kind === "circle" ? 360 : number(p.endAngle, 0, 360, "終了角");
  const sweep = (((end - start + 360) % 360 || 360) * TAU) / 360;
  const steps = Math.ceil(r * sweep * 2);
  if (steps > 2 * MAX_LENGTH) throw Error("半径を小さくしてください");
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (start * TAU) / 360 + (sweep * i) / steps;
    return {
      x: center.x + r * Math.sin(angle),
      y: center.y - r * Math.cos(angle),
    };
  });
}
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let n = i;
  for (let j = 0; j < 8; j++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  return n >>> 0;
});
function chunk(type, data) {
  const bytes = new Uint8Array(12 + data.length),
    view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (const v of bytes.subarray(4, -4))
    crc = crcTable[(crc ^ v) & 255] ^ (crc >>> 8);
  view.setUint32(bytes.length - 4, ~crc);
  return bytes;
}
function png(rows, w, h, colors) {
  const header = new Uint8Array(13),
    view = new DataView(header.buffer);
  view.setUint32(0, w);
  view.setUint32(4, h);
  header.set([8, 3], 8);
  const rgb = colors.flatMap((hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  );
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk("IHDR", header),
    chunk("PLTE", Uint8Array.from([0, 0, 0, ...rgb])),
    chunk("tRNS", Uint8Array.of(0)),
    chunk("IDAT", zlibSync(rows)),
    chunk("IEND", new Uint8Array()),
  ];
  let binary = "";
  for (const part of parts)
    for (let i = 0; i < part.length; i += 8192)
      binary += String.fromCharCode(...part.subarray(i, i + 8192));
  return "data:image/png;base64," + btoa(binary);
}
export function generateRoad(p) {
  const width = number(p.width ?? 5, 1, 128, "道路幅"),
    edge = number(p.edge ?? 1, 0, Math.floor(width / 2), "縁幅");
  const overlap = p.overlap ?? 1;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(edge) ||
    ![0, 1].includes(overlap)
  )
    throw Error("道幅・重ね幅は整数で指定してください");
  const colors = [p.color ?? palette.Yellow, p.edgeColor ?? palette.Gold];
  if (colors.some((c) => !Object.values(palette).includes(c)))
    throw Error("道路色を選択してください");
  const path = centerline(p),
    cells = [];
  for (const p of path) {
    const x = Math.round(p.x),
      y = Math.round(p.y);
    if (x !== cells.at(-1)?.x || y !== cells.at(-1)?.y) cells.push({ x, y });
  }
  const half = Math.floor(width / 2);
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const { x, y } of cells) {
    left = Math.min(left, x - half);
    top = Math.min(top, y - half);
    right = Math.max(right, x + width - 1 - half);
    bottom = Math.max(bottom, y + width - 1 - half);
  }
  const w = right - left + 1,
    h = bottom - top + 1;
  if (
    w * h > 4194304 ||
    left < 0 ||
    right >= SCALE ||
    top < 0 ||
    bottom >= SCALE
  )
    throw Error("範囲を小さくするか、世界の端から離してください");
  const rows = new Uint8Array((w + 1) * h);
  // Reflect one octant to keep stair steps and both road edges symmetric.
  function circularStroke(inset, index) {
    const c = point(p.center),
      r = p.radius;
    const start = p.startAngle ?? 0,
      sweep = (p.endAngle - start + 360) % 360 || 360;
    let previous = Math.round(r);
    for (
      let u = 0;
      u <= Math.min(Math.ceil(r), Math.ceil(r / Math.SQRT2) + width + 1);
      u++
    ) {
      const v = Math.round(Math.sqrt(Math.max(0, r * r - u * u)));
      const extra = overlap && v !== previous ? 1 : 0;
      previous = v;
      for (
        let t = v - half + inset;
        t <= v + width - 1 - half - inset + extra;
        t++
      ) {
        if (t < u) continue;
        for (const [dx, dy] of [
          [u, t],
          [t, u],
          [-u, t],
          [-t, u],
          [u, -t],
          [t, -u],
          [-u, -t],
          [-t, -u],
        ]) {
          const angle = ((Math.atan2(dx, -dy) * 360) / TAU - start + 720) % 360;
          if (p.kind === "arc" && angle > sweep) continue;
          const x = c.x + dx - left,
            y = c.y + dy - top;
          if (x >= 0 && x < w && y >= 0 && y < h)
            rows[y * (w + 1) + 1 + x] = index;
        }
      }
    }
  }
  function stroke(inset, index) {
    if (p.kind !== "clothoid") {
      circularStroke(inset, index);
      return;
    }
    for (let i = 0; i < cells.length; i++) {
      const pt = cells[i],
        prev = cells[Math.max(0, i - 1)],
        next = cells[Math.min(i + 1, cells.length - 1)];
      const vertical = Math.abs(next.y - prev.y) > Math.abs(next.x - prev.x);
      let lo = -half + inset,
        hi = width - 1 - half - inset;
      if (overlap && pt.x !== prev.x && pt.y !== prev.y) {
        if ((vertical ? pt.x - prev.x : pt.y - prev.y) > 0) lo--;
        else hi++;
      }
      for (let t = lo; t <= hi; t++) {
        const x = pt.x - left + (vertical ? t : 0),
          y = pt.y - top + (vertical ? 0 : t);
        if (x >= 0 && x < w && y >= 0 && y < h)
          rows[y * (w + 1) + 1 + x] = index;
      }
    }
  }
  stroke(0, 2);
  if (width > 2 * edge) stroke(edge, 1);
  const nw = worldToLatLng(left, top),
    se = worldToLatLng(right + 1, bottom + 1);
  return {
    id: crypto.randomUUID(),
    schemaVersion: "1",
    name: p.name || "道路作図",
    image: { dataUrl: png(rows, w, h, colors), width: w, height: h },
    bounds: { north: nw.lat, west: nw.lng, south: se.lat, east: se.lng },
    opacity: 1,
    colorMetric: "lab",
    dithering: false,
    useLegacyColors: false,
    colorPaletteMode: "all",
    order: 0,
    locked: false,
    hasPlaced: true,
    visible: true,
  };
}
