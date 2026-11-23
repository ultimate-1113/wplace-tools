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
export async function submitTemplate(source, current, listed = false) {
    const r = await fetch(listed ? "/api/templates?listed=1" : "/api/templates", {
      method: "POST",
      headers: { "Idempotency-Key": current },
      body: source,
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    return data.url;
}
el("share").onclick = async () => {
  const current = key;
  try {
    const url = await submitTemplate(source, current);
    if (current !== key) return;
    el("shared").href = url;
    el("shared").textContent = el("shared").href;
  } catch (e) {
    message(e.message);
  }
};
