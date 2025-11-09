// scripts/item/sheets/implant-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/implant-sheet.hbs";

// V13: Use namespaced ItemSheet
export class CWImplantSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 520, height: 560, template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }]
    });
  }

  getData(opts) {
    const data = super.getData(opts);
    data.categories = ["cybernetic","biotech","symbiont"];
    data.legality   = ["legal","restricted","black"];
    if (!Handlebars.helpers.join) Handlebars.registerHelper("join", (arr, sep) => Array.isArray(arr) ? arr.join(sep ?? ", ") : "");
    if (!Handlebars.helpers.json) Handlebars.registerHelper("json", (v) => JSON.stringify(v ?? [], null, 0));

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

    const pushEffect = (list) => {
      list.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
    };
    const pushMod = (eff) => {
      eff.mods = Array.isArray(eff.mods) ? eff.mods : [];
      eff.mods.push({ path: "dicePool", op: "add", value: 1 });
    };

    html.find(".add-effect").on("click", async () => {
      const current = Array.isArray(this.item.system.effects)
        ? foundry.utils.deepClone(this.item.system.effects)
        : Object.values(this.item.system.effects ?? {});
      pushEffect(current);
      await this.item.update({ "system.effects": current }, { render: false });
      this.render(true);
    });

    html.find(".effect-remove").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const current = Array.isArray(this.item.system.effects)
        ? foundry.utils.deepClone(this.item.system.effects)
        : Object.values(this.item.system.effects ?? {});
      current.splice(i, 1);
      await this.item.update({ "system.effects": current }, { render: false });
      this.render(true);
    });

    html.find(".mod-add").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const current = Array.isArray(this.item.system.effects)
        ? foundry.utils.deepClone(this.item.system.effects)
        : Object.values(this.item.system.effects ?? {});
      pushMod(current[i]);
      await this.item.update({ "system.effects": current }, { render: false });
      this.render(true);
    });

    html.find(".mod-remove").on("click", async (ev) => {
      const i = Number(ev.currentTarget.dataset.index);
      const j = Number(ev.currentTarget.dataset.mod);
      const current = Array.isArray(this.item.system.effects)
        ? foundry.utils.deepClone(this.item.system.effects)
        : Object.values(this.item.system.effects ?? {});
      if (Array.isArray(current[i]?.mods)) current[i].mods.splice(j, 1);
      await this.item.update({ "system.effects": current }, { render: false });
      this.render(true);
    });
  }
}

// V13: Use namespaced Items collection
foundry.documents.collections.Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });