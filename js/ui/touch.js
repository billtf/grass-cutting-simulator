import { el } from "./dom.js";

export function shouldShowTouch() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

export function mountTouch(app, inputInject) {
  const wrap = el(`
    <div id="touch" class="touch-layer">
      <div class="stick" id="stick"><i></i></div>
      <div class="touch-btns">
        <button data-k="use">Cut</button>
        <button data-k="interact">E</button>
        <button data-k="switchTool">Q</button>
        <button data-k="overlay">H</button>
        <button data-k="pause">II</button>
      </div>
    </div>
  `);
  app.appendChild(wrap);
  const stick = wrap.querySelector("#stick");
  const knob = stick.querySelector("i");
  let active = false;

  function setVec(clientX, clientY) {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let x = (clientX - cx) / (r.width / 2);
    let y = (clientY - cy) / (r.height / 2);
    const m = Math.hypot(x, y) || 1;
    if (m > 1) {
      x /= m;
      y /= m;
    }
    inputInject.axis.x = x;
    inputInject.axis.y = y;
    knob.style.transform = `translate(${x * 22}px, ${y * 22}px)`;
  }

  stick.addEventListener("touchstart", (e) => {
    active = true;
    setVec(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  stick.addEventListener("touchmove", (e) => {
    if (active) setVec(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  const end = () => {
    active = false;
    inputInject.axis.x = 0;
    inputInject.axis.y = 0;
    knob.style.transform = "";
  };
  stick.addEventListener("touchend", end);
  stick.addEventListener("touchcancel", end);

  wrap.querySelectorAll("[data-k]").forEach((btn) => {
    const key = btn.dataset.k;
    btn.addEventListener("touchstart", (e) => {
      inputInject.hold(key, true);
      e.preventDefault();
    }, { passive: false });
    btn.addEventListener("touchend", () => inputInject.hold(key, false));
  });
  return wrap;
}
