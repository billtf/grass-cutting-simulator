import { el, showOverlay, hideOverlay } from "../dom.js";
import { pressed } from "../../input.js";
import { generateOffers, maxOpenJobs, reputation } from "../../sim/jobs.js";
import { activeCharacter } from "../../sim/xp.js";
import { beginJob } from "../../sim/away.js";
import { showToast } from "../hud.js";

export function refreshOffers(game) {
  const state = game.state;
  const jobs = state.jobs;
  if (jobs.lastOfferDay === state.clock.day && jobs.offers?.length) return;
  const character = activeCharacter(state);
  jobs.offers = generateOffers(
    state.rng,
    game.jobTypes,
    game.neighbors,
    jobs.neighborsUnlocked,
    character.level,
    reputation(jobs.ratings),
    state.clock.day
  );
  jobs.lastOfferDay = state.clock.day;
}

export function createJobBoardScene(game) {
  refreshOffers(game);
  return {
    id: "jobs",
    transparent: true,
    blocksUpdate: true,
    enter() {
      render();
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {
      if (pressed("pause") || pressed("interact")) game.scenes.pop();
    },
    draw() {},
  };

  function render() {
    const state = game.state;
    const jobs = state.jobs;
    const rep = reputation(jobs.ratings);
    const cap = maxOpenJobs(rep);
    const offers = (jobs.offers || [])
      .map((o) => {
        const taken = jobs.open.some((j) => j.id === o.id);
        return `<div class="shop-row">
          <div><strong>${o.name} · ${o.neighborName}</strong>
          <div class="fine">${o.basePay} coins · ${o.windowStart}:00–${o.windowEnd}:00 · ${o.tasks.join(", ")}</div></div>
          <button class="btn primary" data-act="take-${o.id}" ${taken ? "disabled" : ""}>${taken ? "Taken" : "Accept"}</button>
        </div>`;
      })
      .join("");
    const open = (jobs.open || [])
      .map(
        (o) =>
          `<div class="shop-row"><div><strong>${o.name}</strong><div class="fine">${o.neighborName} · today ${o.windowStart}–${o.windowEnd}</div></div>
          <button class="btn primary" data-act="go-${o.id}">Go</button></div>`
      )
      .join("");
    const card = el(`
      <div class="panel wide">
        <h2>Job board</h2>
        <p class="fine">Reputation ${rep.toFixed(1)} stars · ${jobs.open.length}/${cap} open jobs. Unlocks at level 3.</p>
        <h3>Open</h3>
        <div class="shop-list">${open || "<p class='fine'>No jobs accepted.</p>"}</div>
        <h3>Today's offers</h3>
        <div class="shop-list">${offers || "<p class='fine'>No offers. Level up or wait for a new day.</p>"}</div>
        <div class="btn-col"><button class="btn" data-act="back">Back</button></div>
      </div>
    `);
    card.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "back") game.scenes.pop();
      if (act?.startsWith("take-")) {
        const id = act.slice(5);
        if (jobs.open.length >= cap) {
          alert("You already have enough open jobs.");
          return;
        }
        const offer = jobs.offers.find((o) => o.id === id);
        if (offer) {
          offer.assignedTo = state.activeCharacterId;
          jobs.open.push(offer);
          render();
        }
      }
      if (act?.startsWith("go-")) {
        const job = jobs.open.find((o) => o.id === act.slice(3));
        if (job) {
          game.scenes.pop();
          const neighbor = beginJob(game, job);
          showToast(game.hud, `${neighbor.lineArrive} Press E when you are done.`, 4000);
        }
      }
    });
    showOverlay(game.overlayEl, card);
  }
}
