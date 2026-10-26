/** Shared HTML overlay helpers for menu scenes. */

export function el(html) {
  const wrap = document.createElement("div");
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}

export function clearNode(node) {
  if (!node) return;
  node.replaceChildren();
}

export function showOverlay(root, node) {
  root.classList.add("active");
  root.replaceChildren(node);
}

export function hideOverlay(root) {
  root.classList.remove("active");
  root.replaceChildren();
}
