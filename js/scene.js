/**
 * Scene stack. Push overlays (pause) without tearing down the lawn.
 * A scene may set transparent=true so scenes below still draw.
 * A scene may set blocksUpdate=false so the lawn keeps ticking under a HUD.
 */

export class SceneManager {
  constructor() {
    this.stack = [];
  }

  top() {
    return this.stack[this.stack.length - 1] || null;
  }

  push(scene) {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop() {
    const scene = this.stack.pop();
    scene?.exit?.();
    const top = this.top();
    if (top?.id === "title" || top?.id === "pause" || top?.id === "settings" || top?.id === "shed" || top?.id === "summary") {
      top.enter?.();
    }
    return scene;
  }

  replace(scene) {
    const prev = this.stack.pop();
    prev?.exit?.();
    this.stack.push(scene);
    scene.enter?.();
  }

  clear() {
    while (this.stack.length) this.pop();
  }

  update(dt, game) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const scene = this.stack[i];
      scene.update?.(dt, game);
      if (scene.blocksUpdate !== false) break;
    }
  }

  draw(ctx, game) {
    let start = 0;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (!this.stack[i].transparent) {
        start = i;
        break;
      }
    }
    for (let i = start; i < this.stack.length; i++) {
      this.stack[i].draw?.(ctx, game);
    }
  }
}
