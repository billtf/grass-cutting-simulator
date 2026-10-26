import { el, showOverlay, hideOverlay } from "../dom.js";
import { pressed } from "../../input.js";
import { createCharacter, duplicateCharacter, nextCharacterId } from "../../entities/characters.js";
import { createCreatorScene } from "./creator.js";
import { seasonForDay } from "../../clock.js";

export function createProfilesScene(game) {
  return {
    id: "profiles",
    transparent: true,
    blocksUpdate: true,
    enter() {
      render();
    },
    exit() {
      hideOverlay(game.overlayEl);
    },
    update() {
      if (pressed("pause")) game.scenes.pop();
    },
    draw() {},
  };

  function render() {
    const state = game.state;
    const rows = state.characters
      .map((c) => {
        const active = c.id === state.activeCharacterId ? " (active)" : "";
        return `<div class="shop-row">
          <div><strong>${c.name}${active}</strong>
          <div class="fine">Lv ${c.level} · ${c.traits.join(", ") || "no traits"} · cuts ${c.stats.cellsCut}</div></div>
          <div class="btn-row">
            <button class="btn primary" data-act="active-${c.id}">Use</button>
            <button class="btn" data-act="edit-${c.id}">Edit</button>
            <button class="btn" data-act="dupe-${c.id}">Copy</button>
            <button class="btn danger" data-act="del-${c.id}">Delete</button>
          </div>
        </div>`;
      })
      .join("");
    const card = el(`
      <div class="panel wide">
        <h2>Crew</h2>
        <p class="fine">${state.characters.length} / 4 characters. Traits can swap once per season.</p>
        <div class="shop-list">${rows || "<p>No characters.</p>"}</div>
        <div class="btn-col">
          <button class="btn primary" data-act="new" ${state.characters.length >= 4 ? "disabled" : ""}>New character</button>
          <button class="btn" data-act="skills">Spend skill points</button>
          <button class="btn" data-act="back">Back</button>
        </div>
      </div>
    `);
    card.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "back") game.scenes.pop();
      if (act === "new") openCreator(createCharacter(nextCharacterId(state.characters), "New"), true);
      if (act === "skills") openSkills();
      if (act.startsWith("active-")) {
        state.activeCharacterId = act.slice(7);
        game.save();
        render();
      }
      if (act.startsWith("edit-")) {
        const c = state.characters.find((x) => x.id === act.slice(5));
        if (c) openCreator(c, false);
      }
      if (act.startsWith("dupe-")) {
        if (state.characters.length >= 4) return;
        const c = state.characters.find((x) => x.id === act.slice(5));
        if (c) {
          state.characters.push(duplicateCharacter(c, nextCharacterId(state.characters)));
          game.save();
          render();
        }
      }
      if (act.startsWith("del-")) {
        if (state.characters.length <= 1) {
          alert("You need at least one character.");
          return;
        }
        if (!confirm("Delete this character?")) return;
        const id = act.slice(4);
        state.characters = state.characters.filter((c) => c.id !== id);
        if (state.activeCharacterId === id) state.activeCharacterId = state.characters[0].id;
        game.save();
        render();
      }
    });
    showOverlay(game.overlayEl, card);
  }

  function openCreator(character, isNew) {
    game.scenes.push(
      createCreatorScene(game, {
        character,
        onSave(draft) {
          const season = seasonForDay(game.state.clock.day, game.weatherTable.daysPerSeason);
          const existing = game.state.characters.find((c) => c.id === draft.id);
          if (existing) {
            const traitsChanged = existing.traits.join() !== draft.traits.join();
            if (traitsChanged && existing.lastTraitSwapSeason === season) {
              alert("You can swap traits once per season.");
              draft.traits = existing.traits.slice();
            } else if (traitsChanged) {
              draft.lastTraitSwapSeason = season;
            }
            Object.assign(existing, draft);
          } else if (isNew && game.state.characters.length < 4) {
            game.state.characters.push(draft);
          }
          game.save();
        },
      })
    );
  }

  function openSkills() {
    const c = game.state.characters.find((x) => x.id === game.state.activeCharacterId);
    const card = el(`
      <div class="panel">
        <h2>${c.name} skills</h2>
        <p>Skill points: ${c.skillPoints || 0}. Each point is +3% in that skill.</p>
        <div class="btn-col">
          ${["stamina", "precision", "speed", "botany"]
            .map(
              (s) =>
                `<button class="btn" data-skill="${s}">${s} ${c.skills[s] || 0}</button>`
            )
            .join("")}
          <button class="btn" data-act="back">Back</button>
        </div>
      </div>
    `);
    card.addEventListener("click", (e) => {
      const skill = e.target.closest("[data-skill]")?.dataset.skill;
      if (skill && (c.skillPoints || 0) > 0) {
        c.skills[skill] = (c.skills[skill] || 0) + 1;
        c.skillPoints -= 1;
        game.save();
        openSkills();
      }
      if (e.target.closest("[data-act]")?.dataset.act === "back") {
        render();
      }
    });
    showOverlay(game.overlayEl, card);
  }
}
