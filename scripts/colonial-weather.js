// systems/colonial-weather/scripts/colonial-weather.js

class CWActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "actor"],
      template: "systems/colonial-weather/templates/actor/character-sheet.hbs",
      width: 720,
      height: 640,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "core" }]
    });
  }

  getData(options) {
    const ctx = super.getData(options);
    ctx.system = this.actor.system;
    return ctx;
  }

activateListeners(html) {
  super.activateListeners(html);

  // Core "Standard Test"
  html.on("click", ".cw-roll", ev => this._onRoll(ev));

  // Per-skill buttons on the Skills tab
  html.on("click", ".cw-skill-roll", ev => {
    const skill = ev.currentTarget.dataset.skill;
    // Use the attribute currently selected in Core (fallback DEX)
    const attr = html.find("select[name='cw-attr']").val() || "dex";
    this._rollStandard(attr, skill);
  });

  // Initiative (DEX+WIT)
  html.on("click", ".cw-roll-init", ev => this._onInitRoll(ev));
}

  // Button handler for the Core tab’s “Standard Test”
  _onRoll(ev) {
    ev.preventDefault();
    const form = this.element;
    const attr = form.find("select[name='cw-attr']").val() || "dex";
    const skill = form.find("select[name='cw-skill']").val() || "athletics";
    return this._rollStandard(attr, skill);
  }
  _onInitRoll(ev) {
  ev.preventDefault();
  const dex = Number(this.actor.system.attributes?.dex || 0);
  const wit = Number(this.actor.system.attributes?.wit || 0);
  const dice = Math.max(1, dex + wit);
  const roll = new Roll(`${dice}d10`).roll({ async: false });
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    flavor: `<b>Initiative</b> (DEX ${dex} + WIT ${wit} = ${dice}d10)`
  });
  }

  // Core roller: Attribute + Skill − Wound Penalty; successes on 7–10; 10-again if specialized
  async _rollStandard(attr, skill) {
    const aVal = Number(this.actor.system.attributes?.[attr] ?? 0);
    const sVal = Number(this.actor.system.skills?.[skill] ?? 0);
    const wound = Number(this.actor.system.vitals?.wound_pen ?? 0);
    const specialized = Boolean(this.actor.system.specializations?.[skill]);
    let dice = Math.max(0, aVal + sVal - Math.abs(wound));

    if (dice <= 0) {
      ui.notifications.warn("Dice pool is 0 or less; rolling 1 die.");
      dice = 1;
    }

    const first = await (new Roll(`${dice}d10`)).evaluate({ async: true });
    const faces = first.dice[0].results.map(r => r.result);
    let successes = faces.filter(n => n >= 7).length;
    const ones = faces.filter(n => n === 1).length;

    // 10-again if specialized: reroll each 10 once and count extra successes
    if (specialized) {
      const tens = faces.filter(n => n === 10).length;
      if (tens > 0) {
        const extraRoll = await (new Roll(`${tens}d10`)).evaluate({ async: true });
        const extraFaces = extraRoll.dice[0].results.map(r => r.result);
        successes += extraFaces.filter(n => n >= 7).length;
        // show the rerolls inline in the chat card
        first.terms.push(extraRoll.terms[0]);
      }
    }

    const botch = successes === 0 && ones > 0;

    first.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `
        <div class="cw-chat">
          <h3>Standard Test</h3>
          <p><b>Pool:</b> ${attr.toUpperCase()} (${aVal}) + ${skill} (${sVal}) − Wounds (${Math.abs(wound)}) = <b>${dice}</b> d10</p>
          <p><b>Faces:</b> ${faces.join(", ")} ${specialized ? "(10-again)" : ""}</p>
          <p><b>Successes (7–10):</b> ${successes}${botch ? " — <span class='botch'>BOTCH</span>" : ""}</p>
        </div>`
    });
  }
}

// System init: register sheet + helpers
Hooks.once("init", () => {
  console.log("Colonial Weather | Initializing sheet & helpers");
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("colonial-weather", CWActorSheet, { makeDefault: true });

  // Handlebars helpers used in the sheet .hbs
  Handlebars.registerHelper("uppercase", s => String(s).toUpperCase());
  Handlebars.registerHelper("capitalize", s => String(s).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  // pick(obj, "a","b","c") → subset (used to group skill lists neatly)
  Handlebars.registerHelper("pick", (obj, ...keys) => {
    const opts = keys.pop();
    const out = {};
    if (!obj) return out;
    for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    return out;
  });
});
