/** Keyboard input. Sim and render never read the DOM; they read this snapshot. */

const DOWN = new Set();
const PRESSED = new Set();
const RELEASED = new Set();

const IGNORE_TYPING = new Set(["INPUT", "TEXTAREA"]);

function codeToName(e) {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      return "up";
    case "KeyS":
    case "ArrowDown":
      return "down";
    case "KeyA":
    case "ArrowLeft":
      return "left";
    case "KeyD":
    case "ArrowRight":
      return "right";
    case "Space":
      return "use";
    case "KeyE":
      return "interact";
    case "KeyQ":
      return "switchTool";
    case "KeyH":
      return "overlay";
    case "KeyF":
      return "fastForward";
    case "Escape":
    case "KeyP":
      return "pause";
    case "Backquote":
      return "debug";
    case "Digit1":
    case "Digit2":
    case "Digit3":
    case "Digit4":
    case "Digit5":
    case "Digit6":
    case "Digit7":
    case "Digit8":
    case "Digit9":
      return e.code.replace("Digit", "slot");
    case "KeyZ":
      return "deckDown";
    case "KeyX":
      return "deckUp";
    default:
      return null;
  }
}

function onKeyDown(e) {
  if (IGNORE_TYPING.has(e.target.tagName)) return;
  const name = codeToName(e);
  if (!name) return;
  e.preventDefault();
  if (!DOWN.has(name)) PRESSED.add(name);
  DOWN.add(name);
}

function onKeyUp(e) {
  const name = codeToName(e);
  if (!name) return;
  e.preventDefault();
  DOWN.delete(name);
  RELEASED.add(name);
}

export function bindInput() {
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp, { passive: false });
  window.addEventListener("blur", () => {
    DOWN.clear();
    PRESSED.clear();
    RELEASED.clear();
  });
}

export function beginFrame() {
  /* pressed/released live until endFrame */
}

export function endFrame() {
  PRESSED.clear();
  RELEASED.clear();
}

export function down(name) {
  return DOWN.has(name);
}

export function pressed(name) {
  return PRESSED.has(name);
}

export function released(name) {
  return RELEASED.has(name);
}

export function moveVector() {
  let x = 0;
  let y = 0;
  if (down("left")) x -= 1;
  if (down("right")) x += 1;
  if (down("up")) y -= 1;
  if (down("down")) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function anyMoveDown() {
  return down("left") || down("right") || down("up") || down("down");
}
