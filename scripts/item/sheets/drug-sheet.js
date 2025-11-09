const TEMPLATE = "systems/colonial-weather/templates/items/drug-sheet.hbs";

// V13: Use namespaced ItemSheet
export class CWDrugSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"], width: 520, height: 520, template: TEMPLATE
    });
  }
}
// V13: Use namespaced Items collection
foundry.documents.collections.Items.registerSheet("colonial-weather", CWDrugSheet, { types: ["drug"], makeDefault: true });