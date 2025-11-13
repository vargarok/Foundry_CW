// scripts/item/sheets/implant-sheet.js
const TEMPLATE = "systems/colonial-weather/templates/items/implant-sheet.hbs";

const safeArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
const clone = (v) => foundry.utils.deepClone(v ?? {});

export class CWImplantSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item"],
      width: 560,
      height: 640,
      template: TEMPLATE,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  async getData(options) {
    const data = await super.getData(options);
    const sys = data.item.system ?? data.system ?? {};

    const effects = Array.isArray(sys.effects) ? clone(sys.effects) : [];
    for (const eff of effects) {
      if (!eff) continue;
      eff.label ??= "";
      eff.when ??= {};
      eff.when.tagsCsv ??= "";
      eff.when.rollType ??= "";
      eff.mods = safeArray(eff.mods);
      for (const m of eff.mods) {
        if (!m) continue;
        m.path ??= "dicePool";
        m.op ??= "add";
        m.value = Number(m.value ?? 0);
      }
    }

    data.effects = effects;

    // options for header dropdowns
    data.categories = ["cybernetic", "biotech", "nanotech", "other"];
    data.legality = ["legal", "licensed", "restricted", "illegal"];

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const $html = $(html);

    $html.on("click", ".add-effect", this._onAddEffect.bind(this));
    $html.on("click", ".effect-remove", this._onRemoveEffect.bind(this));
    $html.on("click", ".mod-add", this._onAddMod.bind(this));
    $html.on("click", ".mod-remove", this._onRemoveMod.bind(this));

    $html.on(
      "change",
      "input[name^='system.effects'], select[name^='system.effects'], textarea[name^='system.effects']",
      this._onEffectsChanged.bind(this)
    );
  }

  async _onEffectsChanged(event) {
    event.preventDefault();
    const formData = foundry.utils.formToObject(this.element[0]);
    const expanded = foundry.utils.expandObject(formData);
    const incoming = expanded?.system?.effects ?? [];
    for (const eff of incoming) {
      if (!eff) continue;
      eff.mods = safeArray(eff.mods);
    }
    await this.item.update({ "system.effects": incoming });
  }

  async _onAddEffect(event) {
    event.preventDefault();
    const current = Array.isArray(this.item.system.effects)
      ? clone(this.item.system.effects)
      : [];
    current.push({
      label: "New Effect",
      when: { tagsCsv: "", rollType: "" },
      mods: [{ path: "dicePool", op: "add", value: 1 }]
    });
    await this.item.update({ "system.effects": current });
  }

  async _onRemoveEffect(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const current = Array.isArray(this.item.system.effects)
      ? clone(this.item.system.effects)
      : [];
    if (idx >= 0 && idx < current.length) {
      current.splice(idx, 1);
      await this.item.update({ "system.effects": current });
    }
  }

  async _onAddMod(event) {
    event.preventDefault();
    const effIndex = Number(event.currentTarget.dataset.index);
    const current = Array.isArray(this.item.system.effects)
      ? clone(this.item.system.effects)
      : [];
    if (!current[effIndex]) {
      current[effIndex] = {
        label: "New Effect",
        when: { tagsCsv: "", rollType: "" },
        mods: []
      };
    }
    current[effIndex].mods ??= [];
    current[effIndex].mods.push({ path: "dicePool", op: "add", value: 1 });
    await this.item.update({ "system.effects": current });
  }

  async _onRemoveMod(event) {
    event.preventDefault();
    const effIndex = Number(event.currentTarget.dataset.effIndex);
    const modIndex = Number(event.currentTarget.dataset.modIndex);
    const current = Array.isArray(this.item.system.effects)
      ? clone(this.item.system.effects)
      : [];
    const mods = current[effIndex]?.mods;
    if (Array.isArray(mods) && modIndex >= 0 && modIndex < mods.length) {
      mods.splice(modIndex, 1);
      await this.item.update({ "system.effects": current });
    }
  }
}

// v13 registration
foundry.documents.collections.Items.registerSheet("colonial-weather", CWImplantSheet, {
  types: ["implant"],
  makeDefault: true
});
