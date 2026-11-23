import './menu.js';
import { parseWplaceURL, llzToWorldPixel, summarizePointDetailed } from './utils.js';
const form = document.getElementById("coord-form");
const resultSec = document.getElementById("result");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const url = document.getElementById("urlInput").value.trim();

  try {
    const { lat, lng } = parseWplaceURL(url);
    const pxInfo = llzToWorldPixel(lat, lng);
    const worldX = Math.floor(pxInfo.worldX);
    const worldY = Math.floor(pxInfo.worldY);

    document.getElementById("worldCoord").textContent =
      `(${worldX}, ${worldY})`;

    document.getElementById("chunkCoord").textContent =
      `[${pxInfo.chunkX}, ${pxInfo.chunkY}] (${pxInfo.cLocalX}, ${pxInfo.cLocalY})`;

    document.getElementById("tileCoord").textContent =
      `[${pxInfo.tileX}, ${pxInfo.tileY}] (${pxInfo.tLocalX}, ${pxInfo.tLocalY})`;

    document.getElementById("debug").textContent =
      [
        `URL = ${url}`,
        `raw worldX = ${pxInfo.worldX}`,
        `raw worldY = ${pxInfo.worldY}`,
        summarizePointDetailed("入力URL", pxInfo)
      ].join("\n\n");

    resultSec.hidden = false;
  } catch (err) {
    alert("URL解析エラー: " + err.message);
    console.error(err);
  }
});
