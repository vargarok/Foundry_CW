const TEMPLATE = "systems/colonial-weather/templates/items/implant-sheet.hbs";
export class CWImplantSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 520, height: 540, template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }]
    });
  }
  getData(opts) {
    const data = super.getData(opts);
    data.categories = ["cybernetic","biotech","symbiont"];
    data.legality   = ["legal","restricted","black"];
    if (!Handlebars.helpers.join) {
      Handlebars.registerHelper("join", (arr, sep) => (Array.isArray(arr) ? arr.join(sep ?? ", ") : ""));
    }
    if (!Handlebars.helpers.json) {
        Handlebars.registerHelper("json", (v) => JSON.stringify(v ?? [], null, 0));
    }
    
    // Normalize effects for BOTH contexts the HBS might use:
    const effItem = data.item?.system?.effects;
    const normalized = Array.isArray(effItem) ? effItem : Object.values(effItem ?? {});
    // a) item.system.* (some templates use this)
    if (data.item?.system) data.item.system.effects = normalized;
    // b) system.* (your HBS uses this alias)
    if (data.system) data.system.effects = normalized;
    return data;
  }
  activateListeners(html) {
    console.log("CW Implant Sheet listeners ready for", this.item.id);  
    super.activateListeners(html);
    html.find(".add-effect").on("click", async () => {
  console.log("CW Add Effect clicked for", this.item.id, "type:", this.item.type);

    // Build a clean array and append
    const current = Array.isArray(this.item.system.effects)
    ? foundry.utils.deepClone(this.item.system.effects)
    : Object.values(this.item.system.effects ?? []);
    const newEff = {
    label: "New Effect",
    when: { rollType: "", tagsCsv: "" },
    mods: [{ path: "dicePool", op: "add", value: 1 }]
  };

  current.push(newEff);
  await this.item.update({ "system.effects": current }, { render: false });
  await this.item.sheet.render(true);
  console.log("CW effects after update:", this.item.system.effects);
});
  }
}
Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });
