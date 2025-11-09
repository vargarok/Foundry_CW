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
      if (effects[i]?.mods && effects[i].mods[j]) {
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
       if (!e) return { when: {}, mods: [] };
       if (!e.mods || !Array.isArray(e.mods)) e.mods = Object.values(e.mods || {});
       return e;
    });
  }

  async _proccessForm(html) {
      const form = html[0].closest("form");
      // V13 safe access
      const FDE = foundry.applications?.ux?.FormDataExtended || FormDataExtended;
      const formData = new FDE(form).object;
      const data = foundry.utils.expandObject(formData);

      // ENFORCE ARRAYS
      if (data.system?.effects && !Array.isArray(data.system.effects)) {
          data.system.effects = Object.values(data.system.effects);
      }
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

foundry.documents.collections.Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });