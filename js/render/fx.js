/** Snip bits and light weather. Render-only; never writes sim state. */

export function createFx() {
  return { bits: [], t: 0 };
}

export function spawnSnip(fx, worldX, worldY, reducedMotion = false) {
  if (!fx || reducedMotion) return;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const sp = 18 + Math.random() * 36;
    fx.bits.push({
      x: worldX + (Math.random() - 0.5) * 4,
      y: worldY + (Math.random() - 0.5) * 4,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 22,
      life: 0.28 + Math.random() * 0.28,
      color: i % 3 === 0 ? "#dce775" : i % 3 === 1 ? "#8bc34a" : "#33691e",
    });
  }
}

export function tickFx(fx, dt) {
  if (!fx) return;
  fx.t += dt;
  for (const b of fx.bits) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += 110 * dt;
    b.life -= dt;
  }
  if (fx.bits.length > 80) fx.bits.splice(0, fx.bits.length - 80);
  fx.bits = fx.bits.filter((b) => b.life > 0);
}

export function drawFx(ctx, fx, camera) {
  if (!fx) return;
  for (const b of fx.bits) {
    ctx.globalAlpha = Math.min(1, b.life * 3.2);
    ctx.fillStyle = b.color;
    ctx.fillRect(Math.round(b.x - camera.x), Math.round(b.y - camera.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}

export function drawWeather(ctx, weather, t, reducedMotion) {
  if (reducedMotion) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (weather === "heat") {
    ctx.fillStyle = "rgba(255, 160, 40, 0.07)";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (weather !== "rain" && weather !== "storm") return;
  if (weather === "storm") {
    ctx.fillStyle = "rgba(20, 30, 50, 0.18)";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = weather === "storm" ? "rgba(180, 210, 255, 0.55)" : "rgba(160, 200, 255, 0.4)";
  const n = weather === "storm" ? 28 : 18;
  const phase = (t * 140) % 40;
  for (let i = 0; i < n; i++) {
    const x = ((i * 47 + phase * 0.6) % (w + 8)) - 4;
    const y = ((i * 31 + phase) % (h + 10)) - 4;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 4);
  }
}
