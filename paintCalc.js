import './menu.js';
import { SCALE, parseWplaceURL, llzToWorldPixel, summarizeMap, summarizePointDetailed, paintAmount } from './utils.js';
/* -----------------------------------------------------
 * メイン処理
 * ----------------------------------------------------- */
const form = document.getElementById("paint-form");
const resultSec = document.getElementById("result");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const url1 = document.getElementById("startUrlInput").value.trim();
  const url2 = document.getElementById("endUrlInput").value.trim();
  const roadWidth = parseInt(document.getElementById("roadWidth").value, 10);
  const overlapWidth = parseInt(document.getElementById("overlapWidth").value, 10);

  try {
    const { lat: lat1, lng: lng1 } = parseWplaceURL(url1);
    const { lat: lat2, lng: lng2 } = parseWplaceURL(url2);
    const p1 = llzToWorldPixel(lat1, lng1);
    const p2 = llzToWorldPixel(lat2, lng2);

    const rawDx = Math.abs(p2.worldX - p1.worldX);
    let wrap = false;

    // 日付変更線(±180°)を跨いでいる可能性が高いときだけ選択させる
    if (rawDx > SCALE / 2) {
      
      wrap = confirm(
        "2地点が日付変更線(±180°)を跨いでいる可能性があります。\n" +
        "OK: 日付変更線を跨ぐ（短い方）\n" +
        "キャンセル: 跨がない（長い方）"
      );
      
    }

    const {dx,dy,requiredPx} = paintAmount(p1,p2,roadWidth,overlapWidth,wrap);

    // ===== 標準表示 =====
    document.getElementById("deltaXY").textContent =
      `dx = ${dx} px\ndy = ${dy} px`;

    document.getElementById("requiredPx").textContent =
      `${requiredPx} px`;

    document.getElementById("mapBoth").textContent =
      `地点1 map座標: ${summarizeMap(p1)}\n` +
      `地点2 map座標: ${summarizeMap(p2)}`;

    // ===== 詳細 =====
    document.getElementById("debug").textContent =
      summarizePointDetailed("地点1", p1) + "\n\n" +
      summarizePointDetailed("地点2", p2) + "\n\n" +
      `道路幅 = ${roadWidth}\n重ね幅 = ${overlapWidth}`;

    resultSec.hidden = false;

  } catch (err) {
    alert("URL解析エラー: " + err.message);
    console.error(err);
  }
});
