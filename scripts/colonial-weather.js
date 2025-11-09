// systems/colonial-weather/scripts/colonial-weather.js
import { CWTraitSheet } from "./item/sheets/trait-sheet.js";
import { CWImplantSheet } from "./item/sheets/implant-sheet.js";
import { CWDrugSheet } from "./item/sheets/drug-sheet.js";

// V13: Namespaced ActorSheet
class CWActorSheet extends foundry.appv1.sheets.ActorSheet {
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
    const context = await super.getData(options);
    // Use toObject(false) to get raw data including _id
    const actorData = this.actor.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare standard vitals if missing
    context.system.vitals ??= {};
    const h = (context.system.vitals.health ??= {});
    if (!Array.isArray(h.labels) || h.labels.length !== 8) h.labels = ["0","0","-1","-1","-2","-2","-5","X"];
    if (!Array.isArray(h.penalties) || h.penalties.length !== 8) h.penalties = [0,0,-1,-1,-2,-2,-5,-5];
    h.max ??= 7;
    h.damage ??= 0;

    const dex = Number(context.system.attributes?.dex ?? 0);
    const wit = Number(context.system.attributes?.wit ?? 0);
    context.system.vitals.initiative = dex + wit;

    this._prepareItems(context);

    context.hLabels = h.labels;
    return context;
  }

  _prepareItems(context) {
    const merits = [];
    const flaws = [];
    const backgrounds = [];
    const enhancements = [];
    const gear = [];
    const implants = [];
    const drugs = [];

    // ITERATE OVER THIS.ACTOR.ITEMS directly to be safe
    for (const i of this.actor.items) {
      // Use .toObject(false) so templates get normal data with _id
      const itemData = i.toObject(false);
      itemData.img = i.img || Item.DEFAULT_ICON;
      
      if (i.type === 'merit') merits.push(itemData);
      else if (i.type === 'flaw') flaws.push(itemData);
      else if (i.type === 'background') backgrounds.push(itemData);
      else if (i.type === 'enhancement') enhancements.push(itemData);
      else if (i.type === 'gear') gear.push(itemData);
      else if (i.type === 'implant') implants.push(itemData);
      else if (i.type === 'drug') drugs.push(itemData);
    }

    context.merits = merits;
    context.flaws = flaws;
    context.backgrounds = backgrounds;
    context.enhancements = enhancements;
    context.gear = gear;
    context.implants = implants;
    context.drugs = drugs;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Roller handlers
    html.find(".cw-roll").on("click", ev => this._onRoll(ev));
    html.find(".cw-skill-roll").on("click", ev => {
      const skill = ev.currentTarget.dataset.skill;
      const attr = html.find("select[name='cw-attr']").val() || "dex";
      this._rollStandard(attr, skill);
    });
    html.find(".cw-roll-init").on("click", ev => this._onInitRoll(ev));
    html.find(".cw-roll-save").on("click", ev => this._onSaveRoll(ev));

    // Health & Attributes
    html.on("change", "input[name^='system.attributes.']", ev => this._updateDerivedData(ev));
    html.find("input[name='cw-health']").on("change", ev => {
      const idx = Number(ev.currentTarget.dataset.index || 0);
      this.actor.update({ "system.vitals.health.damage": idx }).then(() => this._updateWoundPenalty());
    });
    html.find(".cw-dmg-minus").on("click", () => this._applyDamage(-1));
    html.find(".cw-dmg-plus").on("click",  () => this._applyDamage(+1));

    // ITEM HANDLERS
    html.find(".item-create").on("click", this._onItemCreate.bind(this));

    html.find(".item-edit").on("click", ev => {
      const li = $(ev.currentTarget).closest(".item");
      // .attr("data-item-id") is safer than .data("itemId") for dynamic lists
      const itemId = li.attr("data-item-id");
      const item = this.actor.items.get(itemId);
      if (item) return item.sheet.render(true);
    });

    html.find(".item-delete").on("click", ev => {
      const li = $(ev.currentTarget).closest(".item");
      const itemId = li.attr("data-item-id");
      const item = this.actor.items.get(itemId);
      if (item) {
        item.delete();
        li.slideUp(200, () => this.render(false));
      }
    });
  }

  // ... [Keep _onSaveRoll, _onRoll, _onInitRoll, _updateDerivedData, _updateWoundPenalty, _applyDamage, _rollStandard as they were] ...
  // Re-inserting to ensure file completeness
  async _onSaveRoll(ev) {
      ev.preventDefault();
      const sta = Number(this.actor.system.attributes?.sta || 0);
      const wit = Number(this.actor.system.attributes?.wit || 0);
      const wound = Number(this.actor.system.vitals?.wound_pen || 0);
      const dice = Math.max(1, sta + wit - Math.abs(wound));
      const roll = new Roll(`${dice}d10`);
      await roll.evaluate();
      const faces = roll.dice[0].results.map(r => r.result);
      const successes = faces.filter(n => n >= 7).length;
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `<b>Save Roll</b> (STA ${sta} + WIT ${wit} − Wounds ${Math.abs(wound)} = ${dice}d10)<br/><b>Successes (7-10):</b> ${successes}`
      });
  }

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
      const wound = Number(this.actor.system.vitals?.wound_pen || 0);
      const mods = globalThis.CWEffects?.collectRollMods(this.actor, { rollType: "initiative", tags: [] }) || { dicePool: 0, initiative: 0 };
      const dice = Math.max(1, dex + wit - Math.abs(wound)) + (mods.dicePool || 0);
      const roll = new Roll(`${dice}d10 + ${mods.initiative || 0}`);
      await roll.evaluate();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `<b>Initiative</b> (DEX ${dex} + WIT ${wit} − Wounds ${Math.abs(wound)} ${mods.dicePool ? `+ Mods ${mods.dicePool}` : ""} = ${dice}d10)`
      });
  }

  _updateDerivedData(event) {
     const dex = Number(this.element.find("input[name='system.attributes.dex']").val() || 0);
     const wit = Number(this.element.find("input[name='system.attributes.wit']").val() || 0);
     const wound = Number(this.actor.system.vitals?.wound_pen || 0);
     let initiative = Math.max(1, dex + wit - Math.abs(wound));
     try {
         const mods = globalThis.CWEffects?.collectRollMods(this.actor, { rollType: "initiative" });
         if (mods?.initiative) initiative += mods.initiative;
     } catch(e) {}
     this.actor.update({ "system.vitals.initiative": initiative }, { diff: false });
  }

  _updateWoundPenalty() {
      const h = this.actor.system.vitals.health;
      const dmg = Math.min(Math.max(0, h.damage), h.max);
      const pen = h.penalties[Math.min(dmg, h.penalties.length - 2)] ?? 0;
      this.actor.update({
          "system.vitals.health.damage": dmg,
          "system.vitals.wound_pen": pen
      }, { diff: false });
  }

  _applyDamage(delta) {
      const h = this.actor.system.vitals.health;
      const newDmg = Math.min(Math.max(0, h.damage + delta), h.max);
      this.actor.update({"system.vitals.health.damage": newDmg}).then(() => this._updateWoundPenalty());
  }

  async _rollStandard(attr, skill) {
      const aVal = Number(this.actor.system.attributes?.[attr] ?? 0);
      const sVal = Number(this.actor.system.skills?.[skill] ?? 0);
      const wound = Number(this.actor.system.vitals?.wound_pen ?? 0);
      const specialized = Boolean(this.actor.system.specializations?.[skill]);
      
      let dice = aVal + sVal - Math.abs(wound);
      let targetNumber = 7;
      let autoSuccesses = 0;
      let modSources = [];

      if (globalThis.CWEffects?.collectRollMods) {
          const mods = globalThis.CWEffects.collectRollMods(this.actor, { rollType: "standard", tags: [skill] });
          dice += (mods.dicePool || 0);
          targetNumber += (mods.difficulty || 0);
          autoSuccesses += (mods.successes || 0);
          modSources = mods.sources || [];
      }

      dice = Math.max(1, dice);
      targetNumber = Math.min(Math.max(2, targetNumber), 10);

      const roll = new Roll(`${dice}d10xs[>=${targetNumber}]`);
      await roll.evaluate();

      let faces = roll.dice[0].results.map(r => r.result);
      let successes = faces.filter(n => n >= targetNumber).length;
      let ones = faces.filter(n => n === 1).length;

      if (specialized) {
          const tens = faces.filter(n => n === 10).length;
          if (tens > 0) {
              const extraRoll = new Roll(`${tens}d10xs[>=${targetNumber}]`);
              await extraRoll.evaluate();
              const extraFaces = extraRoll.dice[0].results.map(r => r.result);
              successes += extraFaces.filter(n => n >= targetNumber).length;
              faces.push(...extraFaces.map(f => `+${f}`));
          }
      }

      successes += autoSuccesses;
      const isBotch = (successes === 0) && (ones > 0);

      let flavor = `
        <div class="cw-chat">
          <h3>${skill.capitalize()} Test</h3>
          <p><b>Pool:</b> ${attr.toUpperCase()} (${aVal}) + ${skill.capitalize()} (${sVal}) − Wounds (${Math.abs(wound)}) = <b>${dice}d10</b></p>
          <p><b>TN:</b> ${targetNumber} ${autoSuccesses ? `(+${autoSuccesses} auto success)` : ""}</p>
          ${modSources.length ? `<p><small>Mods from: ${modSources.join(", ")}</small></p>` : ""}
          <p><b>Faces:</b> ${faces.join(", ")} ${specialized ? "(10-again)" : ""}</p>
          <p class="${isBotch ? 'botch' : ''}" style="font-size: 1.4em; font-weight: bold;">
            ${isBotch ? "BOTCH!" : `${successes} Successes`}
          </p>
        </div>`;

      ChatMessage.create({
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: flavor,
          roll: roll,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL
      });
  }

  async _onItemCreate(event) {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type;
      const itemData = {
          name: `New ${type.capitalize()}`,
          type: type,
          system: {}
      };
      return await Item.create(itemData, { parent: this.actor });
  }
}

Hooks.once("init", () => {
  console.log("Colonial Weather | Initializing");
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("colonial-weather", CWActorSheet, { makeDefault: true });

  Handlebars.registerHelper("uppercase", s => String(s).toUpperCase());
  Handlebars.registerHelper("capitalize", s => String(s).charAt(0).toUpperCase() + String(s).slice(1));
  Handlebars.registerHelper("checked", val => val ? "checked" : "");
  Handlebars.registerHelper("eq", (a,b) => a === b);
  Handlebars.registerHelper("lte", (a,b) => Number(a) <= Number(b));
  Handlebars.registerHelper("pick", (obj, ...keys) => {
      const opts = keys.pop();
      const out = {};
      if (!obj) return out;
      for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
      return out;
  });
});

globalThis.CWActorSheet = CWActorSheet;