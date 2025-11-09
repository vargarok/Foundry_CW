// scripts/item/sheets/implant-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/implant-sheet.hbs";

export class CWImplantSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 550, height: 600, template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  getData(opts) {
    const data = super.getData(opts);
    data.categories = ["cybernetic","biotech","symbiont"];
    data.legality   = ["legal","restricted","black"];
    if (!Handlebars.helpers.join) Handlebars.registerHelper("join", (arr, sep) => Array.isArray(arr) ? arr.join(sep ?? ", ") : "");
    if (!Handlebars.helpers.json) Handlebars.registerHelper("json", (v) => JSON.stringify(v ?? [], null, 0));

    data.effectsArray = this._getEffectsArray();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("input:not([name^='system.effects']), select:not([name^='system.effects']), textarea:not([name^='system.effects'])")
        .on("change", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const el = ev.currentTarget;
          await this.item.update({ [el.name]: el.type === "number" ? Number(el.value) : el.value });
        });

    html.find("[name^='system.effects']").on("change", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
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
    const sys = this.item.toObject().system;
    let eff = sys.effects || [];
    if (!Array.isArray(eff)) eff = Object.values(eff);
    return eff.map(e => {
       if (!e.mods || !Array.isArray(e.mods)) e.mods = Object.values(e.mods || {});
       return e;
    });
  }

  async _saveEffectsFromForm(html) {
      const formData = new FormDataExtended(html[0].closest("form")).object;
      const effects = [];
      for (const [key, value] of Object.entries(formData)) {
          if (key.startsWith("system.effects.")) {
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
      const cleanEffects = effects.filter(e => e);
      await this.item.update({ "system.effects": cleanEffects });
  }
}

foundry.documents.collections.Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });