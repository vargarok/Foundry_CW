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
    // Render using a clean array guaranteed
    data.effectsArray = this._getEffectsArray();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Standard fields (name, description, etc.)
    html.find("input:not([name^='system.effects']), select:not([name^='system.effects']), textarea:not([name^='system.effects'])")
        .on("change", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const el = ev.currentTarget;
          await this.item.update({ [el.name]: el.type === "number" ? Number(el.value) : el.value });
        });

    // Effect fields - NUCLEAR OPTION: update whole array on change
    html.find("[name^='system.effects']").on("change", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // We don't even trust the event target path. We rebuild the whole array from DOM.
        await this._saveEffectsFromForm(html);
    });

    html.find(".add-effect").on("click", async (ev) => {
      ev.preventDefault();
      const effects = this._getEffectsArray();
      effects.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      // Force update as array
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
      if (effects[idx]) {
          effects[idx].mods.push({ path: "dicePool", op: "add", value: 1 });
          await this.item.update({ "system.effects": effects });
      }
    });

    html.find(".mod-remove").on("click", async (ev) => {
      ev.preventDefault();
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const effects = this._getEffectsArray();
      if (effects[i]?.mods) {
          effects[i].mods.splice(j, 1);
          await this.item.update({ "system.effects": effects });
      }
    });
  }

  _getEffectsArray() {
    // Safely extract effects, handling both Array and Object (Map) storage formats
    const sys = this.item.toObject().system;
    let eff = sys.effects || [];
    if (!Array.isArray(eff)) eff = Object.values(eff);
    
    // Normalize structure
    return eff.map(e => {
       if (!e.mods || !Array.isArray(e.mods)) e.mods = Object.values(e.mods || {});
       return e;
    });
  }

  // Rebuilds the entire effects array from the HTML form state to guarantee consistency
  async _saveEffectsFromForm(html) {
      const formData = new FormDataExtended(html[0].closest("form")).object;
      const effects = [];
      
      // Re-construct the array from flat form paths like 'system.effects.0.label'
      for (const [key, value] of Object.entries(formData)) {
          if (key.startsWith("system.effects.")) {
              // Regex to parse: system.effects.<index>.<prop> or system.effects.<i1>.mods.<i2>.<prop>
              const match = key.match(/system\.effects\.(\d+)\.(.+)/);
              if (match) {
                  const idx = Number(match[1]);
                  const path = match[2];
                  if (!effects[idx]) effects[idx] = { when: {}, mods: [] };
                  
                  if (path.startsWith("mods.")) {
                      const modMatch = path.match(/mods\.(\d+)\.(.+)/);
                      if (modMatch) {
                          const mIdx = Number(modMatch[1]);
                          const mPath = modMatch[2];
                          if (!effects[idx].mods[mIdx]) effects[idx].mods[mIdx] = {};
                          effects[idx].mods[mIdx][mPath] = value;
                      }
                  } else {
                      foundry.utils.setProperty(effects[idx], path, value);
                  }
              }
          }
      }
      
      // Clean up empty slots if any and ensure it's a dense array
      const cleanEffects = effects.filter(e => e);
      await this.item.update({ "system.effects": cleanEffects });
  }
}