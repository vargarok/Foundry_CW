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
    return data;
  }
  activateListeners(html) {
    console.log("CW Implant Sheet listeners ready for", this.item.id);  
    super.activateListeners(html);
    html.find(".add-effect").on("click", async () => {
  console.log("CW Add Effect clicked for", this.item.id, "type:", this.item.type);

  // Initialize for legacy items that predate the schema
  if (!Array.isArray(this.item.system.effects)) {
    await this.item.update({ "system.effects": [] }, { render: false });
  }

  const index = Array.isArray(this.item.system.effects) ? this.item.system.effects.length : 0;
  const newEff = {
    label: "New Effect",
    when: { rollType: "", tagsCsv: "" },
    mods: [{ path: "dicePool", op: "add", value: 1 }]
  };

  // Path write is safest for array append
  const upd = await this.item.update({ [`system.effects.${index}`]: newEff }, { render: false });
  await this.item.sheet.render(true);

  // Sanity log
  console.log("CW effects after update:", foundry.utils.deepClone(this.item.system.effects));
});
  }
}
Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });
