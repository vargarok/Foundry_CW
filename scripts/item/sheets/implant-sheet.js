// scripts/item/sheets/implant-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/implant-sheet.hbs";

export class CWImplantSheet extends ItemSheet {
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

    // Normalize both aliases used by HBS
    const effItem = data.item?.system?.effects;
    const normalized = Array.isArray(effItem) ? effItem : Object.values(effItem ?? {});
    if (data.item?.system) data.item.system.effects = normalized;
    if (data.system)       data.system.effects     = normalized;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-effect").on("click", async () => {
      const current = Array.isArray(this.item.system.effects)
        ? foundry.utils.deepClone(this.item.system.effects)
        : Object.values(this.item.system.effects ?? {});
      current.push({
        label: "New Effect",
        when: { rollType: "", tagsCsv: "" },
        mods: [{ path: "dicePool", op: "add", value: 1 }]
      });
      await this.item.update({ "system.effects": current }, { render: false });
      await this.item.sheet.render(true);
    });
  }
}
Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });
