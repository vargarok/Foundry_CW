import { CWTraitSheet } from "./item/sheets/trait-sheet.js";

// V13: Use namespaced ActorSheet
class CWActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "actor"],
      template: "systems/colonial-weather/templates/actor/character-sheet.hbs",
      width: 780,
      height: 680,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "core" }]
    });
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.system = this.actor.system;

    const sys = data.system;
    sys.vitals ??= {};
    const h = (sys.vitals.health ??= {});

    if (!Array.isArray(h.labels) || h.labels.length !== 8) {
      h.labels = ["0","0","-1","-1","-2","-2","-5","X"];
    }
    if (!Array.isArray(h.penalties) || h.penalties.length !== 8) {
      h.penalties = [0,0,-1,-1,-2,-2,-5,-5];
    }
    if (typeof h.max !== "number") h.max = 7;
    if (typeof h.damage !== "number") h.damage = 0;

    const dex = Number(sys.attributes?.dex ?? 0);
    const wit = Number(sys.attributes?.wit ?? 0);
    sys.vitals.initiative = dex + wit;

    data.hLabels = h.labels;

    // Prepare items for the new Traits tab
    data.merits = data.items.filter(i => i.type === "merit");
    data.flaws = data.items.filter(i => i.type === "flaw");
    data.backgrounds = data.items.filter(i => i.type === "background");
    data.enhancements = data.items.filter(i => i.type === "enhancement");

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is standard for Actor Sheets to handle item interaction
    html.find(".item-edit").click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    html.find(".item-delete").click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    html.on("click", ".cw-roll", ev => this._onRoll(ev));
    html.on("click", ".cw-skill-roll", ev => {
      const skill = ev.currentTarget.dataset.skill;
      const attr = html.find("select[name='cw-attr']").val() || "dex";
      this._rollStandard(attr, skill);
    });
    html.on("click", ".cw-roll-init", ev => this._onInitRoll(ev));
    html.on("click", ".cw-roll-save", ev => this._onSaveRoll(ev));
    html.on("change", "input[name='cw-health']", ev => {
      const idx = Number(ev.currentTarget.dataset.index || 0);
      this.actor.update({ "system.vitals.health.damage": idx }).then(() => this._updateWoundPenalty());
    });
    html.on("click", ".cw-dmg-minus", ev => this._applyDamage(-1));
    html.on("click", ".cw-dmg-plus",  ev => this._applyDamage(+1));
    html.on("change", "input[name^='system.attributes.']", ev => this.render(false));
  }

// ... rest of the file (rollers, etc.) remains the same as previous version ...
  async _onSaveRoll(ev) {
    ev.preventDefault();
    const sta = Number(this.actor.system.attributes?.sta || 0);
    const wit = Number(this.actor.system.attributes?.wit || 0);
    const wound = Number(this.actor.system.vitals?.wound_pen || 0);
    
    const ctx = { rollType: "save", tags: new Set() };
    const mods = (globalThis.CWEffects?.collectRollMods?.(this.actor, ctx)) || { dicePool: 0, difficulty: 0, successes: 0 };

    const dice = Math.max(1, sta + wit - Math.abs(wound) + (mods.dicePool || 0));
    const tn = 7 + (mods.difficulty || 0);

    const roll = new Roll(`${dice}d10`);
    await roll.evaluate();
    
    const faces = roll.dice[0].results.map(r => r.result);
    let successes = faces.filter(n => n >= tn).length;
    successes += (mods.successes || 0);

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Save Roll</b> (STA ${sta} + WIT ${wit} − Wounds ${Math.abs(wound)} + Mods ${mods.dicePool} = ${dice}d10)<br/>Target Number: ${tn}<br/><b>Successes:</b> ${successes}`
    });
  }

  _onRoll(ev) {
    ev.preventDefault();
    const form = this.element;
    const attr = form.find("select[name='cw-attr']").val() || "dex";
    const skill = form.find("select[name='cw-skill']").val() || "athletics";
    const isSpec = form.find("input[name='cw-spec']").is(":checked");
    return this._rollStandard(attr, skill, { specialized: isSpec });
  }

  async _onInitRoll(ev) {
    ev.preventDefault();
    const dex = Number(this.actor.system.attributes?.dex || 0);
    const wit = Number(this.actor.system.attributes?.wit || 0);
    const wound = Number(this.actor.system.vitals?.wound_pen || 0);
    
    const ctx = { rollType: "initiative", tags: new Set() };
    const mods = (globalThis.CWEffects?.collectRollMods?.(this.actor, ctx)) || { dicePool: 0, initiative: 0 };
    
    const dice = Math.max(1, dex + wit - Math.abs(wound) + (mods.dicePool || 0));
    const flatBonus = Number(mods.initiative || 0);

    const roll = new Roll(`${dice}d10 + ${flatBonus}`);
    await roll.evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Initiative</b> (DEX ${dex} + WIT ${wit} − Wounds ${Math.abs(wound)} + Mods ${mods.dicePool} = ${dice}d10 + ${flatBonus})`
    });
  }

  _updateWoundPenalty() {
    const h = this.actor.system.vitals.health || {};
    const dmg = Math.max(0, Math.min(Number(h.damage ?? 0), Number(h.max ?? 7)));
    const penalties = h.penalties || [0, 0, -1, -1, -2, -2, -5, -5];
    const lastPenalized = penalties.length - 2; 
    const idxForPenalty = Math.min(dmg, lastPenalized);
    const pen = penalties[idxForPenalty] ?? 0;
    const incapacitated = dmg >= penalties.length - 1;

    this.actor.update({
      "system.vitals.health.damage": dmg,
      "system.vitals.wound_pen": pen,
      "system.vitals.health.incapacitated": incapacitated
    });
  }

  _applyDamage(delta) {
    const h = this.actor.system.vitals.health;
    const newDmg = Math.min(Math.max(Number(h.damage || 0) + delta, 0), Number(h.max || 7));
    this.actor.update({ "system.vitals.health.damage": newDmg }).then(() => this._updateWoundPenalty());
  }

  async _rollStandard(attr, skill, options={}) {
    const aVal = Number(this.actor.system.attributes?.[attr] ?? 0);
    const sVal = Number(this.actor.system.skills?.[skill] ?? 0);
    const wound = Number(this.actor.system.vitals?.wound_pen ?? 0);
    const specialized = options.specialized || Boolean(this.actor.system.specializations?.[skill]);
    
    let mods = { dicePool:0, difficulty:0, successes:0, sources:[] };
    try {
       const ctx = { rollType: "standard", tags: new Set([skill, attr]) };
       mods = globalThis.CWEffects.collectRollMods(this.actor, ctx);
    } catch(e) { console.warn(e); }

    let dice = Math.max(0, aVal + sVal - Math.abs(wound) + mods.dicePool);
    let tn = 7 + mods.difficulty;
    
    if (dice <= 0) {
       ui.notifications.warn("Dice pool reduced to 0. Rolling 1 die of desperation.");
       dice = 1; 
       tn = Math.max(tn, 8);
    }

    const first = await (new Roll(`${dice}d10`)).evaluate();
    const faces = first.dice[0].results.map(r => r.result);
    let successes = faces.filter(n => n >= tn).length;
    const ones = faces.filter(n => n === 1).length;

    if (specialized) {
      const tens = faces.filter(n => n === 10).length;
      if (tens > 0) {
        const extraRoll = await (new Roll(`${tens}d10`)).evaluate();
        const extraFaces = extraRoll.dice[0].results.map(r => r.result);
        successes += extraFaces.filter(n => n >= tn).length;
        first.terms.push(extraRoll.terms[0]);
      }
    }

    successes += mods.successes;
    const botch = (successes === 0 && ones > 0);
    const sourcesHtml = mods.sources.length ? `<div style="font-size: 0.8em; opacity: 0.8;">Mods from: ${mods.sources.join(", ")}</div>` : "";

    first.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `
        <div class="cw-chat">
          <h3>${skill.toUpperCase()} (${attr.toUpperCase()})</h3>
          <div><b>Pool:</b> ${aVal} + ${sVal} − ${Math.abs(wound)} (wounds) + ${mods.dicePool} (mods) = <b>${dice}</b> d10</div>
          <div><b>TN:</b> ${tn}</div>
          ${sourcesHtml}
          <hr/>
          <div><b>Faces:</b> ${faces.join(", ")} ${specialized ? "(10-again)" : ""}</div>
          <div style="font-size: 1.2em; margin-top: 5px;">
            <b>Successes:</b> ${successes} ${botch ? " — <span style='color:red'>BOTCH</span>" : ""}
          </div>
        </div>`
    });
  }
}

Hooks.once("init", () => {
  console.log("Colonial Weather | Initializing");
  // V13: Use namespaced Actors collection
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("colonial-weather", CWActorSheet, { makeDefault: true });

  // V13: Use namespaced Items collection
  foundry.documents.collections.Items.registerSheet("colonial-weather", CWTraitSheet, { 
    types: ["merit", "flaw", "background", "enhancement"], 
    makeDefault: true 
  });

  Handlebars.registerHelper("uppercase", s => String(s).toUpperCase());
  Handlebars.registerHelper("capitalize", s => String(s).charAt(0).toUpperCase() + String(s).slice(1));
  Handlebars.registerHelper("pick", (obj, ...keys) => {
    keys.pop();
    const out = {};
    if (!obj) return out;
    for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    return out;
  });
});