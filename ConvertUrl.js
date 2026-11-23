import './menu.js';
import { parseWplaceURL, llzToWorldPixel, roadUrlToWplaceUrl, wplaceUrlToRoadUrls } from './utils.js';
const form = document.getElementById('convert-form');
const resultSec = document.getElementById('result');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const mode = document.getElementById('modeSelect').value;
  const urlStr = document.getElementById('urlInput').value.trim();
  const zoomVal = parseFloat(document.getElementById('zoomInput').value) || 20;

  try {
    const { lat, lng } = parseWplaceURL(urlStr);
    document.getElementById('inputCoord').textContent = `lat=${lat}\nlng=${lng}`;

    // ボックス要素
    const singleBox = document.getElementById('singleBox');
    const rightBox  = document.getElementById('rightBox');
    const leftBox   = document.getElementById('leftBox');

    const outputLinks = document.getElementById('outputLinks');
    const outputPre = document.getElementById('outputCoord');

    const oc1 = document.getElementById('outputCoord1');
    const oc2 = document.getElementById('outputCoord2');
    const link1 = document.getElementById('outputLink1');
    const link2 = document.getElementById('outputLink2');

    // 初期化
    singleBox.style.display = "none";
    rightBox.style.display = "none";
    leftBox.style.display = "none";
    outputLinks.innerHTML = "";
    outputPre.textContent = "";
    oc1.textContent = "";
    oc2.textContent = "";
    link1.textContent = "";
    link2.textContent = "";

    // ===== 順方向：洋上 → 現地 =====
    if (mode === "forward") {
      const outUrl = roadUrlToWplaceUrl(urlStr, zoomVal);
      const { lat: OL, lng: OG } = parseWplaceURL(outUrl);

      singleBox.style.display = "block";
      document.getElementById('resultTitle').textContent = "変換結果（地図 → 現地）";
      outputPre.textContent = `lat=${OL}\nlng=${OG}`;

      const a = document.createElement("a");
      a.href = outUrl;
      a.textContent = "⇒ 現地をwplaceで開く";
      a.target = "_blank";
      a.className = "link";
      outputLinks.appendChild(a);

      const src = llzToWorldPixel(lat, lng);
      document.getElementById('debug').textContent =
        `worldX=${src.worldX}\nworldY=${src.worldY}\nURL=${outUrl}`;
    }


    // ===== 逆方向：現地 → 洋上 =====
    else {
      const results = wplaceUrlToRoadUrls(urlStr, zoomVal);
      document.getElementById('resultTitle').textContent = "変換結果（現地 → 地図）";

      // ---- 候補が1件の場合：既存の1枠表示 ----
      if (results.length === 1) {
        const r = results[0];
        const { lat: rl, lng: rg } = parseWplaceURL(r);

        singleBox.style.display = "block";
        outputPre.textContent = `lat=${rl}\nlng=${rg}`;

        const a = document.createElement("a");
        a.href = r;
        a.textContent = "⇒ 道路地図をwplaceで開く";
        a.target = "_blank";
        a.className = "link";
        outputLinks.appendChild(a);
      }

      // ---- 候補が2件：右・左に分けて表示 ----
      else if (results.length === 2) {
        // 右側（候補1）
        const r1 = results[0];
        const { lat: r1lat, lng: r1lng } = parseWplaceURL(r1);
        rightBox.style.display = "block";
        oc1.textContent = `lat=${r1lat}\nlng=${r1lng}`;
        link1.href = r1;
        link1.textContent = "⇒ 道路地図(右)をwplaceで開く";

        // 左側（候補2）
        const r2 = results[1];
        const { lat: r2lat, lng: r2lng } = parseWplaceURL(r2);
        leftBox.style.display = "block";
        oc2.textContent = `lat=${r2lat}\nlng=${r2lng}`;
        link2.href = r2;
        link2.textContent = "⇒ 道路地図(左)をwplaceで開く";
      }

      // ---- 詳細（worldX/Y → URLの順） ----
      const src = llzToWorldPixel(lat, lng);
      let dbg = `worldX=${src.worldX}\nworldY=${src.worldY}\n`;
      results.forEach((r, i) => dbg += `URL${i+1}=${r}\n`);
      document.getElementById('debug').textContent = dbg;
    }

    resultSec.hidden = false;

  } catch (err) {
    alert("変換エラー: " + err.message);
    console.error(err);
  }
});
