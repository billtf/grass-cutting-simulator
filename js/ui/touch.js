import { el } from "./dom.js";

export function shouldShowTouch() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

export function setTouchVisible(wrap, on) {
  if (wrap) wrap.classList.toggle("hidden", !on);
}

export function mountTouch(app, inputInject) {
  const wrap = el(`
    <div id="touch" class="touch-layer hidden">
      <div class="stick" id="stick"><i></i></div>
      <div class="touch-btns">
        <button type="button" data-k="use">Cut</button>
        <button type="button" data-k="interact">E</button>
        <button type="button" data-k="switchTool">Q</button>
        <button type="button" data-k="overlay">H</button>
        <button type="button" data-k="pause">II</button>
      </div>
    </div>
  `);
  if (!shouldShowTouch()) wrap.classList.add("click-only");
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

  stick.addEventListener("pointerdown", (e) => {
    active = true;
    try {
      stick.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setVec(e.clientX, e.clientY);
    e.preventDefault();
  });
  stick.addEventListener("pointermove", (e) => {
    if (active) setVec(e.clientX, e.clientY);
  });
  const end = () => {
    active = false;
    inputInject.axis.x = 0;
    inputInject.axis.y = 0;
    knob.style.transform = "";
  };
  stick.addEventListener("pointerup", end);
  stick.addEventListener("pointercancel", end);

  wrap.querySelectorAll("[data-k]").forEach((btn) => {
    const key = btn.dataset.k;
    const start = (e) => {
      inputInject.hold(key, true);
      e.preventDefault();
    };
    const stop = (e) => {
      inputInject.hold(key, false);
      if (e) e.preventDefault();
    };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  return wrap;
}
