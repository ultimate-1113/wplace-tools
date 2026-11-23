import { parseTemplate } from "./template.js";
let source, objectUrl, key;
const el = (id) => document.getElementById(id);
export function message(value) {
  el("message").textContent = value;
}
export function show(text, template = parseTemplate(text)) {
  source = text;
  key = crypto.randomUUID();
  URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  el("download").href = objectUrl;
  el("preview").src = template.image.dataUrl;
  el("output").hidden = false;
  el("shared").removeAttribute("href");
  el("shared").textContent = "";
  message("");
}
el("share").onclick = async () => {
  const current = key;
  try {
    const r = await fetch("/api/templates", {
      method: "POST",
      headers: { "Idempotency-Key": current },
      body: source,
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    if (current !== key) return;
    el("shared").href = data.url;
    el("shared").textContent = el("shared").href;
  } catch (e) {
    message(e.message);
  }
};
