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
    
    // Ensure we always have a valid array for rendering
    const sys = data.item.toObject().system;
    data.effectsArray = (Array.isArray(sys.effects) ? sys.effects : Object.values(sys.effects || {}))
      .map(e => {
         if (!e.mods || !Array.isArray(e.mods)) e.mods = [];
         return e;
      });

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // GENERIC INPUT HANDLER (The Nuclear Option)
    html.find("input, select, textarea").on("change", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      
      const el = ev.currentTarget;
      // If it's in the effects list, we must handle it manually to avoid array indexing issues
      if (el.name.startsWith("system.effects")) {
         await this._handleEffectFieldChange(el.name, el.type === "number" ? Number(el.value) : el.value);
      } else {
         // Standard field, safe to just update directly
         await this.item.update({ [el.name]: el.type === "number" ? Number(el.value) : el.value });
      }
    });

    html.find(".add-effect").on("click", async (ev) => {
      ev.preventDefault();
      const system = this._getSystemClone();
      if (!Array.isArray(system.effects)) system.effects = [];
      system.effects.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      await this.item.update({ "system": system });
    });

    html.find(".effect-remove").on("click", async (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const system = this._getSystemClone();
      system.effects.splice(idx, 1);
      await this.item.update({ "system": system });
    });

    html.find(".mod-add").on("click", async (ev) => {
      ev.preventDefault();
      const idx = Number(ev.currentTarget.dataset.index);
      const system = this._getSystemClone();
      system.effects[idx].mods.push({ path: "dicePool", op: "add", value: 1 });
      await this.item.update({ "system": system });
    });

    html.find(".mod-remove").on("click", async (ev) => {
      ev.preventDefault();
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const system = this._getSystemClone();
      system.effects[i].mods.splice(j, 1);
      await this.item.update({ "system": system });
    });
  }

  _getSystemClone() {
    const system = foundry.utils.deepClone(this.item.system);
    // Ensure it's a real array before we start messing with it
    if (!Array.isArray(system.effects)) {
        system.effects = Object.values(system.effects || {});
    }
    // Normalize mods
    system.effects.forEach(e => {
       if (!e.mods || !Array.isArray(e.mods)) e.mods = [];
    });
    return system;
  }

  async _handleEffectFieldChange(path, value) {
      // Path looks like: system.effects.0.mods.1.value
      // We need to apply this to a clean clone and update the WHOLE system to avoid race conditions
      const system = this._getSystemClone();
      // Strip 'system.' from the start to get the relative path
      const relativePath = path.replace(/^system\./, "");
      foundry.utils.setProperty(system, relativePath, value);
      await this.item.update({ system: system });
  }
}