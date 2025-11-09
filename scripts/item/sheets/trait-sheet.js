// scripts/item/sheets/trait-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/trait-sheet.hbs";

export class CWTraitSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 550, height: 500, template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  getData(opts) {
    const data = super.getData(opts);
    if (!Handlebars.helpers.eq) Handlebars.registerHelper("eq", (a, b) => a === b);
    // Always work with a clean, deep copy of the effects array for rendering
    data.effectsArray = this._getEffectsClone();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("input, select, textarea").on("change", ev => this._onStandardChange(ev));

    html.find(".add-effect").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const effects = this._getEffectsClone();
      effects.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      await this.item.update({ "system.effects": effects });
    });

    html.find(".effect-remove").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsClone();
      if (idx >= 0 && idx < effects.length) {
         effects.splice(idx, 1);
         await this.item.update({ "system.effects": effects });
      }
    });

    html.find(".mod-add").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsClone();
      if (effects[idx]) {
          if (!Array.isArray(effects[idx].mods)) effects[idx].mods = [];
          effects[idx].mods.push({ path: "dicePool", op: "add", value: 1 });
          await this.item.update({ "system.effects": effects });
      }
    });

    html.find(".mod-remove").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const effects = this._getEffectsClone();
      if (effects[i] && Array.isArray(effects[i].mods) && effects[i].mods[j]) {
          effects[i].mods.splice(j, 1);
          await this.item.update({ "system.effects": effects });
      }
    });
  }

  // Helper to get a guaranteed deep copy of the current effects array
  _getEffectsClone() {
    const system = this.item.toObject().system;
    let effects = Array.isArray(system.effects) ? system.effects : Object.values(system.effects || {});
    // Filter out any null/undefined entries and ensure structure
    return effects.filter(e => e).map(e => {
        if (!e.mods || !Array.isArray(e.mods)) e.mods = [];
        return e;
    });
  }

  async _onStandardChange(event) {
    event.preventDefault();
    // We use fully qualified paths for standard inputs to avoid overwriting whole objects
    const field = event.currentTarget.name;
    const value = event.currentTarget.type === "number" 
      ? Number(event.currentTarget.value) 
      : event.currentTarget.value;
    await this.item.update({ [field]: value });
  }
}