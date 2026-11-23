import "./menu.js";
import { show, message } from "./template-view.js";
import { LIMIT } from "./template.js";
document.getElementById("upload").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > LIMIT) throw Error("アップロード上限は1.5 MBです");
    show(await file.text());
  } catch (err) {
    message(err.message);
  }
};
async function load() {
  const id = new URLSearchParams(location.search).get("id");
  if (id) {
    const r = await fetch("/api/templates/" + encodeURIComponent(id));
    if (!r.ok) throw Error("テンプレートが見つかりません");
    show(await r.text());
  }
  const r = await fetch("/api/templates");
  if (!r.ok) throw Error("一覧を取得できません");
  const catalog = document.getElementById("catalog");
  for (const item of await r.json()) {
    const a = document.createElement("a");
    a.href = "?id=" + encodeURIComponent(item.id);
    a.textContent = item.name;
    catalog.append(a, document.createElement("br"));
  }
  if (!catalog.children.length)
    catalog.textContent = "登録されている公式テンプレートはありません。";
}
load().catch((e) => message(e.message));
