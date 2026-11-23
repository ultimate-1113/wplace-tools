const button = document.getElementById("menuBtn");
const panel = document.getElementById("menuPanel");
function toggle(open) {
  button.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
}
toggle(false);
button.addEventListener("click", () => toggle(panel.hidden));
panel.addEventListener("click", () => toggle(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) {
    toggle(false);
    button.focus();
  }
});
