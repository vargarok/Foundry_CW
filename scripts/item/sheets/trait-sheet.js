// scripts/item/sheets/trait-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/trait-sheet.hbs";

// V13: Use namespaced ItemSheet
export class CWTraitSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 550, height: 500, template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false, // DISABLE automatic submission to prevent race conditions
      closeOnSubmit: false
    });
  }

  getData(opts) {
    const data = super.getData(opts);
    if (!Handlebars.helpers.eq) Handlebars.registerHelper("eq", (a, b) => a === b);
    
    // Ensure effects is always an array for handlebars
    const eff = data.item.toObject().system.effects || [];
    const normalized = Array.isArray(eff) ? eff : Object.values(eff);
    
    // Ensure every effect has a mods array
    normalized.forEach(e => {
      if (!e.mods || !Array.isArray(e.mods)) e.mods = [];
    });

    // We don't need to write back to data.item.system here, Handlebars will use 'normalized' if we pass it
    data.effectsArray = normalized;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Manually handle all standard inputs since we disabled submitOnChange
    html.find("input, select, textarea").on("change", ev => this._onStandardChange(ev));

    html.find(".add-effect").on("click", ev => {
      ev.preventDefault();
      const effects = this._getEffectsArray();
      effects.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      this.item.update({ "system.effects": effects });
    });

    html.find(".effect-remove").on("click", ev => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsArray();
      effects.splice(idx, 1);
      this.item.update({ "system.effects": effects });
    });

    html.find(".mod-add").on("click", ev => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsArray();
      effects[idx].mods.push({ path: "dicePool", op: "add", value: 1 });
      this.item.update({ "system.effects": effects });
    });

    html.find(".mod-remove").on("click", ev => {
      ev.preventDefault();
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const effects = this._getEffectsArray();
      effects[i].mods.splice(j, 1);
      this.item.update({ "system.effects": effects });
    });
  }

  // Helper to get a clean array of current effects
  _getEffectsArray() {
    const system = this.item.toObject().system;
    return Array.isArray(system.effects) ? system.effects : [];
  }

  // Manual handler for normal fields
  async _onStandardChange(event) {
    event.preventDefault();
    const field = event.currentTarget.name;
    const value = event.currentTarget.type === "number" 
      ? Number(event.currentTarget.value) 
      : event.currentTarget.value;
    await this.item.update({ [field]: value });
  }
}