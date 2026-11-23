import './menu.js';
import { parseWplaceURL, llzToWorldPixel, toLocal, toWplaceURL, SLOPE_SET, planPolylineWorld, polylineSlopes, buildDebugText } from './utils.js';
const form = document.getElementById('plan-form');
const resultSec = document.getElementById('result');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const startUrl = document.getElementById('startUrlInput').value.trim();
  const endUrl   = document.getElementById('endUrlInput').value.trim();
  const order    = document.getElementById('order').value;

  try {
    const { lat: sLat, lng: sLng } = parseWplaceURL(startUrl);
    const { lat: eLat, lng: eLng } = parseWplaceURL(endUrl);

    const p1 = llzToWorldPixel(sLat, sLng);
    const p2 = llzToWorldPixel(eLat, eLng);

    const plan2 = planPolylineWorld(
      { x: p1.worldX, y: p1.worldY },
      { x: p2.worldX, y: p2.worldY },
      SLOPE_SET,
      { order, roundToInt: true }
    );

    // 始点
    const s4k = toLocal(plan2.polylineWorld[0].x, plan2.polylineWorld[0].y, 4000);
    document.getElementById('startLocal').textContent =
      `[${s4k.chunkX}, ${s4k.chunkY}] (${s4k.x}, ${s4k.y})`;
    document.getElementById('startLink').href =
      toWplaceURL(plan2.polylineWorld[0].x, plan2.polylineWorld[0].y, 18);

    // 折れ点
    const b4k = plan2.bendLocal;
    document.getElementById('bendLocal').textContent =
      b4k ? `[${b4k.chunkX}, ${b4k.chunkY}] (${b4k.x}, ${b4k.y})` : "—";
    document.getElementById("bendLink").hidden = !b4k;
    document.getElementById('bendLink').href =
      b4k ? toWplaceURL(plan2.bend.x, plan2.bend.y, 18) : "";

    // 終点
    const e4k = toLocal(plan2.plannedEnd.x, plan2.plannedEnd.y, 4000);
    document.getElementById('endLocal').textContent =
      `[${e4k.chunkX}, ${e4k.chunkY}] (${e4k.x}, ${e4k.y})`;
    document.getElementById('endLink').href =
      toWplaceURL(plan2.plannedEnd.x, plan2.plannedEnd.y, 18);

    // 傾き
    const slopes = polylineSlopes(plan2);
    document.getElementById('slopeStart').textContent = slopes.start ?? '—';
    document.getElementById('slopeEnd').textContent = slopes.end ?? '—';

    // ---- デバッグ出力 ----
    const debugText = buildDebugText(plan2);
    document.getElementById('debug').textContent = debugText;
    resultSec.hidden = false;

  } catch (err) {
    alert('URLの解析または計算でエラー: ' + err.message);
    console.error(err);
  }
});
