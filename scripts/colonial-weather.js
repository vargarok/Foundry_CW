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

async getData(options = {}) {
  // 1) Start with the full context from Foundry
  const data = await super.getData(options);

  // 2) Work with the existing system data; don't replace it
  const sys = data.system ?? this.actor.system ?? {};

  // 3) Ensure health structure exists (fallbacks for older actors)
  sys.vitals ??= {};
  const h = (sys.vitals.health ??= {});
  if (!Array.isArray(h.labels) || h.labels.length !== 7) {
    h.labels = ["-0", "-0", "-1", "-1", "-2", "-2", "X"];
  }
  if (!Array.isArray(h.penalties) || h.penalties.length !== 7) {
    h.penalties = [0, 0, -1, -1, -2, -2, -5];
  }
  if (typeof h.max !== "number") h.max = 7;
  if (typeof h.damage !== "number") h.damage = 0;

  // 4) (Optional) keep Initiative always in sync here too
  const dex = Number(sys.attributes?.dex ?? 0);
  const wit = Number(sys.attributes?.wit ?? 0);
  sys.vitals.initiative = dex + wit;

  // 5) Expose a convenience array for the template (optional)
  data.hLabels = h.labels;

  // 6) Return the original context, augmented (do NOT replace it)
  return data;
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
    // This listener is what updates the "Initiative" vital on the sheet
    html.on("change", "input[name^='system.attributes.']", ev => this._updateDerivedData(ev));
    html.on("click", ".cw-roll-save", ev => this._onSaveRoll(ev));

    // Click a box (radio) to set damage directly
    html.on("change", "input[name='cw-health']", ev => {
      const idx = Number(ev.currentTarget.dataset.index || 0);
      this.actor.update({ "system.vitals.health.damage": idx }).then(() => this._updateWoundPenalty());
    });

    // Heal / Damage buttons
    html.on("click", ".cw-dmg-minus", ev => this._applyDamage(-1));
    html.on("click", ".cw-dmg-plus",  ev => this._applyDamage(+1));

    // Also recompute penalty when DEX/WIT change, since some UIs overwrite fields
    html.on("change", "input[name='system.attributes.dex'], input[name='system.attributes.wit']", () => this.render(false));
  }

  async _onSaveRoll(ev) {
    ev.preventDefault();
    const sta = Number(this.actor.system.attributes?.sta || 0);
    const wit = Number(this.actor.system.attributes?.wit || 0);
    const wound = Number(this.actor.system.vitals?.wound_pen || 0);
    const dice = Math.max(1, sta + wit - Math.abs(wound));

    const roll = new Roll(`${dice}d10`);
    // FIXED: Added 'await' and '{async: true}' to actually perform the roll
    await roll.evaluate({ async: true }); 
    const faces = roll.dice[0].results.map(r => r.result);
    const successes = faces.filter(n => n >= 7).length;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Save Roll</b> (STA ${sta} + WIT ${wit} − Wounds ${Math.abs(wound)} = ${dice}d10)<br/>
               <b>Successes (7-10):</b> ${successes}`
    });
  }

  // Button handler for the Core tab’s “Standard Test”
  _onRoll(ev) {
    ev.preventDefault();
    const form = this.element;
    const attr = form.find("select[name='cw-attr']").val() || "dex";
    const skill = form.find("select[name='cw-skill']").val() || "athletics";
    return this._rollStandard(attr, skill);
  }

  async _onInitRoll(ev) {
    ev.preventDefault();
    const dex = Number(this.actor.system.attributes?.dex || 0);
    const wit = Number(this.actor.system.attributes?.wit || 0);
    const dice = Math.max(1, dex + wit);

    const roll = new Roll(`${dice}d10`);
    // FIXED: Added 'await' and '{async: true}' to actually perform the roll
    await roll.evaluate({ async: true });

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Initiative</b> (DEX ${dex} + WIT ${wit} = ${dice}d10)`
    });
  }

  _updateDerivedData(event) {
    // FIX: Read from the form elements directly to get the current values,
    // as 'this.actor.system' is one step behind during the 'change' event.
    // We use 'this.element' which is the jQuery-wrapped form.
    const dex = Number(this.element.find("input[name='system.attributes.dex']").val() || 0);
    const wit = Number(this.element.find("input[name='system.attributes.wit']").val() || 0);

    const initiative = dex + wit;
    
    // Write back to the actor’s system data
    // We use { diff: false } to prevent recursion on the 'change' listener
    this.actor.update({ "system.vitals.initiative": initiative }, { diff: false });
  }
  _updateWoundPenalty() {
  const h = this.actor.system.vitals.health;
  const dmg = Math.min(Math.max(Number(h?.damage || 0), 0), Number(h?.max || 7));
  const penalties = Array.isArray(h?.penalties) ? h.penalties : [0,0,-1,-1,-2,-2,-5];
  // Sum penalties up to the damage taken, excluding the incapacitated last box
  const capped = Math.min(dmg, penalties.length - 1);
  const pen = penalties.slice(0, capped).reduce((a,b) => a + b, 0);
  this.actor.update({
    "system.vitals.health.damage": dmg,
    "system.vitals.wound_pen": pen
  }, { diff: false });
}

_applyDamage(delta) {
  const h = foundry.utils.duplicate(this.actor.system.vitals.health);
  h.damage = Math.min(Math.max(Number(h.damage || 0) + delta, 0), Number(h.max || 7));
  this.actor.update({ "system.vitals.health": h }).then(() => this._updateWoundPenalty());
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
  Handlebars.registerHelper("pick", (obj, ...keys) => { // FIXED: Was 'Handlelebars'
    const opts = keys.pop();
    const out = {};
    if (!obj) return out;
    for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    return out;
  });
});