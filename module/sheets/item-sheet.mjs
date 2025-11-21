const { HandlebarsApplicationMixin } = foundry.applications.api;
const { DocumentSheetV2 } = foundry.applications.api;

export class CWItemSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["cw", "sheet", "item"],
    position: { width: 550, height: 500 },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: "systems/colonial-weather/templates/item/item-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    context.item = this.document;
    context.system = this.document.system;
    context.config = CONFIG.CW;
    context.editable = this.isEditable;

    // FIX: Use the correct V13 namespace for TextEditor
    context.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(
        this.document.system.description, 
        {
            async: true,
            secrets: this.document.isOwner,
            relativeTo: this.document
        }
    );
    
    context.traitTypes = { "merit": "Merit", "flaw": "Flaw" };
    
    return context;
  }
}