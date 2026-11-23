import './menu.js';
import { formatDateTimeYMDHM, calcFinishFromTwoPoints, readIntLike } from './utils.js';
const form = document.getElementById("finish-form");
const resultSec = document.getElementById("result");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const dt1 = document.getElementById("dt1").value;
  const dt2 = document.getElementById("dt2").value;
  const rem1 = readIntLike(document.getElementById("rem1").value);
  const rem2 = readIntLike(document.getElementById("rem2").value);

  try {
    const r = calcFinishFromTwoPoints(dt1, rem1, dt2, rem2);

    document.getElementById("outFinish").textContent =
      `${formatDateTimeYMDHM(r.finishDate)}`;

    document.getElementById("outRate").textContent =
      `${r.ratePerMin.toFixed(3)} paint/min`;

    document.getElementById("outPeople").textContent =
      `${r.people.toFixed(1)} 人`;

    document.getElementById("debug").textContent =
      [
        `日付1=${formatDateTimeYMDHM(r.t1)}  残ペイント1=${r.rem1}`,
        `日付2=${formatDateTimeYMDHM(r.t2)}  残ペイント2=${r.rem2}`,
        `2日付間の分数=${r.minutes}`,
        `ペイント差=${r.deltaRemaining}`,
        `毎分ペイント数=${r.ratePerMin}`,
        `一人が一分当たりに塗れる量=${r.onePersonRate}`,
        `人数=${r.people}`,
        `完成日=${formatDateTimeYMDHM(r.finishDate)}`
      ].join("\n");

    resultSec.hidden = false;

  } catch (err) {
    alert("計算エラー: " + err.message);
    console.error(err);
  }
});
