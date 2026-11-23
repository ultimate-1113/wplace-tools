import "./menu.js";
import { show, message, submitTemplate } from "./template-view.js";
import { LIMIT, parseTemplate } from "./template.js";
import { placeTemplate } from "./placement.js";
const placement = document.getElementById("placement");
let original;
function openTemplate(text) {
  show(text);
  original = text;
  placement.value = "";
  document.getElementById("share").disabled = false;
}
placement.oninput = () => {
  const url = placement.value.trim();
  try {
    if (!url) return openTemplate(original);
    const { template, x, y } = placeTemplate(parseTemplate(original), url);
    show(JSON.stringify(template));
    document.getElementById("share").disabled = false;
    message(`設置地点（中心）: (${x}, ${y})`);
  } catch (err) {
    document.getElementById("download").removeAttribute("href");
    document.getElementById("share").disabled = true;
    document.getElementById("shared").removeAttribute("href");
    document.getElementById("shared").textContent = "";
    message(err.message);
  }
};
const upload = document.getElementById("upload");
const publish = document.getElementById("publish");
const published = document.getElementById("published");
let selected;
upload.onchange = async () => {
  const file = upload.files[0];
  selected = null;
  publish.disabled = true;
  published.removeAttribute("href");
  published.textContent = "";
  try {
    if (!file) return;
    if (file.size > LIMIT) throw Error("アップロード上限は1.5 MBです");
    const text = await file.text();
    if (upload.files[0] !== file) return;
    openTemplate(text);
    selected = { text, key: crypto.randomUUID() };
    publish.disabled = false;
  } catch (err) {
    message(err.message);
  }
};
publish.onclick = async () => {
  const entry = selected;
  if (!entry) return;
  publish.disabled = true;
  try {
    const url = await submitTemplate(entry.text, entry.key, true);
    if (selected === entry) {
      published.href = url;
      published.textContent = "公開したテンプレート";
    }
    await loadCatalog();
  } catch (err) {
    if (entry === selected) publish.disabled = false;
    message(err.message);
  }
};
async function load() {
  const id = new URLSearchParams(location.search).get("id");
  if (id) {
    const r = await fetch("/api/templates/" + encodeURIComponent(id));
    if (!r.ok) throw Error("テンプレートが見つかりません");
    openTemplate(await r.text());
  }
  await loadCatalog();
}
async function loadCatalog() {
  const r = await fetch("/api/templates");
  if (!r.ok) throw Error("一覧を取得できません");
  const catalog = document.getElementById("catalog");
  const items = await r.json();
  catalog.replaceChildren();
  for (const item of items) {
    const a = document.createElement("a");
    a.href = "?id=" + encodeURIComponent(item.id);
    a.textContent = item.name;
    catalog.append(a);
    if (item.official) {
      const badge = document.createElement("strong");
      badge.className = "official-badge";
      badge.textContent = "公式";
      catalog.append(badge);
    }
    catalog.append(document.createElement("br"));
  }
  if (!catalog.children.length)
    catalog.textContent = "登録されているテンプレートはありません。";
}
load().catch((e) => message(e.message));
