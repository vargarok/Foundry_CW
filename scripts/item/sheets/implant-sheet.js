// scripts/item/sheets/implant-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/implant-sheet.hbs";

// A small helper to deep-clone and ensure arrays exist without rebuilding them every render
function safeArray(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

export class CWImplantSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 550,
      height: 600,
      template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  /** Handlebars data */
  getData(opts) {
    const data = super.getData(opts);

    // DO NOT rebuild arrays with Object.values on every render.
    // Clone what exists; expose a separate "effectsArray" for the template.
    const sys = data.system ?? {};
    const effects = Array.isArray(sys.effects) ? foundry.utils.deepClone(sys.effects) : [];

    // Normalise inner "mods" only if they are truly not arrays (and keep order)
    for (const eff of effects) {
      if (!eff) continue;
      eff.mods = Array.isArray(eff.mods) ? eff.mods : safeArray(eff.mods);
    }

    data.effectsArray = effects;
    // Provide selects
    data.categories = ["cybernetic", "biotech", "pharma", "misc"];
    data.legality   = ["legal", "restricted", "illegal"];

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const $html = $(html); // Wrap html in jQuery

    // Add / Remove Effect
    $html.on("click", ".add-effect", this._onAddEffect.bind(this));
    $html.on("click", ".effect-remove", this._onRemoveEffect.bind(this));

    // Add / Remove Modifier
    $html.on("click", ".mod-add", this._onAddMod.bind(this));
    $html.on("click", ".mod-remove", this._onRemoveMod.bind(this));

    // Save-on-change...
    $html.on("change", "input[name^='system.effects'], select[name^='system.effects']", async (ev) => {
      await this._saveEffectsFromForm($html); // Pass the jQuery object
    });
  }

  /** Read only the effects section from the form and write back just that */
  async _saveEffectsFromForm(html) {
    const form = html[0];
    const raw = foundry.utils.expandObject(foundry.utils.formToObject(form));
    const incoming = raw?.system?.effects ?? [];

    // Ensure mods is an array for every effect
    for (const eff of incoming) {
      if (!eff) continue;
      eff.mods = Array.isArray(eff.mods) ? eff.mods : safeArray(eff.mods);
    }
    await this.item.update({ "system.effects": incoming });
  }

  async _onAddEffect(ev) {
    ev.preventDefault();
    const current = Array.isArray(this.item.system.effects) ? foundry.utils.deepClone(this.item.system.effects) : [];
    current.push({ label: "", tags: "", rollType: "(any)", mods: [] });
    await this.item.update({ "system.effects": current });
  }

  async _onRemoveEffect(ev) {
    ev.preventDefault();
    const idx = Number(ev.currentTarget.dataset.index);
    const current = Array.isArray(this.item.system.effects) ? foundry.utils.deepClone(this.item.system.effects) : [];
    if (idx >= 0 && idx < current.length) current.splice(idx, 1);
    await this.item.update({ "system.effects": current });
  }

  async _onAddMod(ev) {
    ev.preventDefault();
    const effIndex = Number(ev.currentTarget.dataset.index);
    const current = Array.isArray(this.item.system.effects) ? foundry.utils.deepClone(this.item.system.effects) : [];
    current[effIndex] ??= { label: "", tags: "", rollType: "(any)", mods: [] };
    current[effIndex].mods ??= [];
    current[effIndex].mods.push({ path: "dicePool", op: "add", value: 0 });
    await this.item.update({ "system.effects": current });
  }

  async _onRemoveMod(ev) {
    ev.preventDefault();
    const effIndex = Number(ev.currentTarget.dataset.eff);
    const modIndex = Number(ev.currentTarget.dataset.mod);
    const current = Array.isArray(this.item.system.effects) ? foundry.utils.deepClone(this.item.system.effects) : [];
    if (current[effIndex]?.mods && modIndex >= 0 && modIndex < current[effIndex].mods.length) {
      current[effIndex].mods.splice(modIndex, 1);
      await this.item.update({ "system.effects": current });
    }
  }
}

// v13: register under the correct namespace and types
foundry.documents.collections.Items.registerSheet(
  "colonial-weather",
  CWImplantSheet,
  { types: ["implant"], makeDefault: true }
);
