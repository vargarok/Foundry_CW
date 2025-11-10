// scripts/item/sheets/trait-sheet.js

// --- config ---------------------------------------------------------------

const SYSTEM_ID = "colonial-weather";
const SHEET_TEMPLATES = {
  trait:        `systems/colonial-weather/templates/items/trait-sheet.hbs`,
  merit:        `systems/colonial-weather/templates/items/trait-sheet.hbs`,
  flaw:         `systems/colonial-weather/templates/items/trait-sheet.hbs`,
  background:   `systems/colonial-weather/templates/items/trait-sheet.hbs`,
  enhancement:  `systems/colonial-weather/templates/items/trait-sheet.hbs`,
};

// --- helpers --------------------------------------------------------------

function safeArray(v) {
  return Array.isArray(v) ? v : (v != null ? [v] : []);
}

// Deep clone a value (small wrapper for readability)
function clone(v) {
  return foundry.utils.deepClone(v);
}

// --- sheet class ----------------------------------------------------------

export class CWTraitSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "item", "cw-trait"],
      width: 560,
      height: 600,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "details" }],
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  /** Use a template per item type (or one shared template). */
  get template() {
    const t = SHEET_TEMPLATES[this.item.type];
    return t ?? SHEET_TEMPLATES.trait;
  }

  /** Supply data to Handlebars without rebuilding arrays each render. */
  async getData(options) {
    const data = await super.getData(options);

    const sys = data.system ?? {};
    const effects = Array.isArray(sys.effects) ? clone(sys.effects) : [];

    // Normalise nested arrays but keep order & identity stable
    for (const eff of effects) {
      if (!eff) continue;
      eff.mods = Array.isArray(eff.mods) ? eff.mods : safeArray(eff.mods);
    }

    data.effectsArray = effects;

    // Example selects (adapt as needed by your template)
    data.rollTypes = ["(any)", "initiative", "attack", "defense", "skill"];

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const $html = $(html); // Wrap html in jQuery

    // Add / remove whole effect blocks
    $html.on("click", ".add-effect", this._onAddEffect.bind(this));
    $html.on("click", ".effect-remove", this._onRemoveEffect.bind(this));

    // Add / remove individual modifiers...
    $html.on("click", ".mod-add", this._onAddMod.bind(this));
    $html.on("click", ".mod-remove", this._onRemoveMod.bind(this));

    // Persist changes...
    $html.on(
      "change",
      "input[name^='system.effects'], select[name^='system.effects'], textarea[name^='system.effects']",
      async () => { await this._saveEffectsFromForm($html); } // Pass the jQuery object
    );
  }

  // --- data writes --------------------------------------------------------

  /** Read only the effects subtree from the form and write it back. */
  async _saveEffectsFromForm(html) {
    const form = html[0];
    const expanded = foundry.utils.expandObject(foundry.utils.formToObject(form));
    const incoming = expanded?.system?.effects ?? [];

    for (const eff of incoming) {
      if (!eff) continue;
      eff.mods = Array.isArray(eff.mods) ? eff.mods : safeArray(eff.mods);
    }

    await this.item.update({ "system.effects": incoming });
  }

  async _onAddEffect(event) {
  event.preventDefault();
  const current = Array.isArray(this.item.system.effects) ? clone(this.item.system.effects) : [];
  // Create the correct nested structure matching trait-sheet.hbs
  current.push({
    label: "New Effect",
    when: {
      tagsCsv: "",
      rollType: "" // Corresponds to the "(any)" option with value=""
    },
    mods: []
  });
  await this.item.update({ "system.effects": current });
}

  async _onRemoveEffect(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.dataset.index);
    const current = Array.isArray(this.item.system.effects) ? clone(this.item.system.effects) : [];
    if (idx >= 0 && idx < current.length) current.splice(idx, 1);
    await this.item.update({ "system.effects": current });
  }

  async _onAddMod(event) {
  event.preventDefault();
  const effIndex = Number(event.currentTarget.dataset.index);
  const current = Array.isArray(this.item.system.effects) ? clone(this.item.system.effects) : [];

  // Also fix the default structure here, in case an effect has no mods
  current[effIndex] ??= {
    label: "New Effect",
    when: {
      tagsCsv: "",
      rollType: ""
    },
    mods: []
  };

  current[effIndex].mods ??= [];
  current[effIndex].mods.push({
    path: "dicePool", // adapt to your schema
    op: "add",
    value: 0
  });

  await this.item.update({ "system.effects": current });
}

  async _onRemoveMod(event) {
    event.preventDefault();
    const effIndex = Number(event.currentTarget.dataset.eff);
    const modIndex = Number(event.currentTarget.dataset.mod);
    const current = Array.isArray(this.item.system.effects) ? clone(this.item.system.effects) : [];

    if (current[effIndex]?.mods && modIndex >= 0 && modIndex < current[effIndex].mods.length) {
      current[effIndex].mods.splice(modIndex, 1);
      await this.item.update({ "system.effects": current });
    }
  }
}

// --- registration ---------------------------------------------------------

// Register this sheet for all the "trait-like" types.
// Adjust the list to match your system's actual item types.
foundry.documents.collections.Items.registerSheet(SYSTEM_ID, CWTraitSheet, {
  types: ["trait", "merit", "flaw", "background", "enhancement"],
  makeDefault: true
});
