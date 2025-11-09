const TEMPLATE = "systems/colonial-weather/templates/items/trait-sheet.hbs";

// V13: Use namespaced ItemSheet
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
    data.effectsArray = this._getEffectsArray();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("input, select, textarea").on("change", ev => this._onStandardChange(ev));

    html.find(".add-effect").on("click", async (ev) => {
      ev.preventDefault();
      const effects = this._getEffectsArray();
      effects.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      await this.item.update({ "system.effects": effects });
    });

    html.find(".effect-remove").on("click", async (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsArray();
      if (idx >= 0 && idx < effects.length) {
         effects.splice(idx, 1);
         await this.item.update({ "system.effects": effects });
      }
    });

    html.find(".mod-add").on("click", async (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsArray();
      // Guard against race conditions where the index might be invalid
      if (effects[idx]) {
          if (!Array.isArray(effects[idx].mods)) effects[idx].mods = [];
          effects[idx].mods.push({ path: "dicePool", op: "add", value: 1 });
          await this.item.update({ "system.effects": effects });
      }
    });

    html.find(".mod-remove").on("click", async (ev) => {
      ev.preventDefault();
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const effects = this._getEffectsArray();
      // Guard against invalid indices for both effect and mod
      if (effects[i] && Array.isArray(effects[i].mods) && effects[i].mods[j]) {
          effects[i].mods.splice(j, 1);
          await this.item.update({ "system.effects": effects });
      }
    });
  }

  // Robust helper to get guaranteed clean data
  _getEffectsArray() {
    const system = this.item.toObject().system;
    let effects = Array.isArray(system.effects) ? system.effects : Object.values(system.effects || {});
    // Ensure every effect has a valid 'mods' array to prevent future undefined errors
    return effects.map(e => {
        if (!e.mods || !Array.isArray(e.mods)) e.mods = [];
        return e;
    });
  }

  async _onStandardChange(event) {
    event.preventDefault();
    const field = event.currentTarget.name;
    const value = event.currentTarget.type === "number" 
      ? Number(event.currentTarget.value) 
      : event.currentTarget.value;
    await this.item.update({ [field]: value });
  }
}