import "./menu.js";
import { palette } from "./palette.js";
import { generateRoad } from "./road.js";
import { show, message } from "./template-view.js";
const form = document.getElementById("road");
for (const [name, selected] of [
  ["color", "Yellow"],
  ["edgeColor", "Gold"],
]) {
  for (const [label, value] of Object.entries(palette))
    form.elements[name].add(
      new Option(label, value, false, label === selected),
    );
}
function fields() {
  const kind = form.elements.kind.value;
  for (const [id, visible] of [
    ["centerFields", kind !== "clothoid"],
    ["spiralFields", kind === "clothoid"],
    ["angles", kind === "arc"],
  ]) {
    const group = document.getElementById(id);
    group.disabled = group.hidden = !visible;
  }
}
fields();
form.elements.kind.onchange = fields;
form.onsubmit = (e) => {
  e.preventDefault();
  try {
    const p = Object.fromEntries(new FormData(form));
    for (const k of [
      "radius",
      "length",
      "startAngle",
      "endAngle",
      "width",
      "edge",
      "overlap",
    ])
      if (k in p) p[k] = Number(p[k]);
    const template = generateRoad(p);
    show(JSON.stringify(template), template);
  } catch (err) {
    message(err.message);
  }
};
