const { HandlebarsApplicationMixin } = foundry.applications.api;
const { DocumentSheetV2 } = foundry.applications.api;

export class CWItemSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["cw", "sheet", "item"],
    position: { width: 500, height: 450 },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: "systems/colonial-weather/templates/item/item-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // 1. Pass the Item document itself (Critical for {{item.type}} checks)
    context.item = this.document;
    
    // 2. Pass system data
    context.system = this.document.system;
    
    // 3. Pass Config and Editable state
    context.config = CONFIG.CW;
    context.editable = this.isEditable; 
    
    // 4. Helper for trait types
    context.traitTypes = { "merit": "Merit", "flaw": "Flaw" };
    
    return context;
  }
}