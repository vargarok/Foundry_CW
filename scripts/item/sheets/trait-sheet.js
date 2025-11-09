const TEMPLATE = "systems/colonial-weather/templates/items/trait-sheet.hbs";

// V13: Use namespaced ItemSheet
export class CWTraitSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 520, height: 450, template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }]
    });
  }

  getData(opts) {
    const data = super.getData(opts);
    if (!Handlebars.helpers.eq) Handlebars.registerHelper("eq", (a, b) => a === b);
    
    const eff = data.item?.system?.effects;
    const normalized = Array.isArray(eff) ? eff : Object.values(eff ?? {});
    for (const e of normalized) {
      if (!Array.isArray(e.mods)) e.mods = Array.isArray(e.mods) ? e.mods : Object.values(e.mods ?? {});
    }
    if (data.item?.system) data.item.system.effects = normalized;
    if (data.system)       data.system.effects     = normalized;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".add-effect").on("click", async () => {
      const current = this._getEffectsClone();
      current.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      await this.item.update({ "system.effects": current });
    });

    html.find(".effect-remove").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const current = this._getEffectsClone();
      current.splice(i, 1);
      await this.item.update({ "system.effects": current });
    });

    html.find(".mod-add").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const current = this._getEffectsClone();
      if (!current[i].mods) current[i].mods = [];
      current[i].mods.push({ path: "dicePool", op: "add", value: 1 });
      await this.item.update({ "system.effects": current });
    });

    html.find(".mod-remove").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const current = this._getEffectsClone();
      if (current[i]?.mods) current[i].mods.splice(j, 1);
      await this.item.update({ "system.effects": current });
    });
  }

  _getEffectsClone() {
    return Array.isArray(this.item.system.effects)
      ? foundry.utils.deepClone(this.item.system.effects)
      : Object.values(this.item.system.effects ?? {});
  }
}