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
    // Always render as a clean array
    data.effectsArray = this._getEffectsArray();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Universal handler for ALL inputs.
    // We defer to a heavy-duty save function that cleans up the data structure every time.
    html.find("input, select, textarea").on("change", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._proccessForm(html);
    });

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
      effects.splice(idx, 1);
      await this.item.update({ "system.effects": effects });
    });

    html.find(".mod-add").on("click", async (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const effects = this._getEffectsArray();
      // Ensure the target effect exists before trying to add to it
      if (effects[idx]) {
         if (!effects[idx].mods) effects[idx].mods = [];
         effects[idx].mods.push({ path: "dicePool", op: "add", value: 1 });
         await this.item.update({ "system.effects": effects });
      }
    });

    html.find(".mod-remove").on("click", async (ev) => {
      ev.preventDefault();
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const effects = this._getEffectsArray();
      // Safe Removal
      if (effects[i]?.mods && effects[i].mods[j]) {
          effects[i].mods.splice(j, 1);
          await this.item.update({ "system.effects": effects });
      }
    });
  }

  _getEffectsArray() {
    // Force whatever is in the data into a real Array
    const sys = this.item.toObject().system;
    let eff = sys.effects || [];
    if (!Array.isArray(eff)) eff = Object.values(eff);
    
    // Deep clean: ensure every effect and its mods are real arrays
    return eff.map(e => {
       if (!e) return { when: {}, mods: [] }; // fallback for empty slots
       if (!e.mods || !Array.isArray(e.mods)) e.mods = Object.values(e.mods || {});
       return e;
    });
  }

  // The "Heavy Duty" save function that fixes the data structure on every edit
  async _proccessForm(html) {
      const form = html[0].closest("form");
      // V13 compatibility for FormDataExtended
      const FDE = foundry.applications?.ux?.FormDataExtended || FormDataExtended;
      const formData = new FDE(form).object;
      
      // Expand flat form data (system.effects.0.label) into a deep object
      const data = foundry.utils.expandObject(formData);

      // CRITICAL STEP: Force the expanded object back into real Arrays before saving
      if (data.system?.effects && !Array.isArray(data.system.effects)) {
          data.system.effects = Object.values(data.system.effects);
      }
      // Do the same for nested mods arrays
      if (Array.isArray(data.system?.effects)) {
          data.system.effects.forEach(eff => {
              if (eff.mods && !Array.isArray(eff.mods)) {
                  eff.mods = Object.values(eff.mods);
              }
          });
      }

      await this.item.update(data);
  }
}