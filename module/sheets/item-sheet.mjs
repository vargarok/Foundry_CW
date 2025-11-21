// Imports - Update to pull from .api
const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class CWItemSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["cw", "sheet", "item"],
    position: { width: 550, height: 600 },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
        // Define any sheet-specific actions here if needed
    }
  };

  static PARTS = {
    form: { template: "systems/colonial-weather/templates/item/item-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    context.item = this.document;
    context.system = this.document.system;
    context.config = CONFIG.CW;
    
    // Force editable to true for the owner
    context.editable = this.document.isOwner; 

    console.log("CW | Preparing Item Sheet", {
        description: this.document.system.description,
        editable: context.editable
    });

    // Enrich HTML
    const rawDesc = this.document.system.description || "";
    context.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(
        rawDesc, 
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