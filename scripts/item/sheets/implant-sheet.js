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
        console.log("CW Add Effect clicked for", this.item.id);
  if (!Array.isArray(this.item.system.effects)) {
    await this.item.update({ "system.effects": [] }, { render: false });
  }
  const index = this.item.system.effects.length;
  const newEff = {
    when: { rollType: "", tagsCsv: "" },
    mods: [{ path: "dicePool", op: "add", value: 1 }],
    label: "New Effect"
  };
  // write directly to the next array slot; Foundry will create the array if needed
  await this.item.update({ [`system.effects.${index}`]: newEff });
  this.render(true);
});
  }
}
Items.registerSheet("colonial-weather", CWImplantSheet, { types: ["implant"], makeDefault: true });
