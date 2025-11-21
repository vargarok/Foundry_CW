const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class CWActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["cw", "sheet", "actor"],
    position: { width: 800, height: 900 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      rollAttribute: this._onRollAttribute,
      rollSkill: this._onRollSkill,
      toggleSpecialized: this._onToggleSpecialized,
      rollHitLocation: this._onRollHitLocation,
      changeTab: this._onChangeTab
    }
  };

  static PARTS = {
    header: { template: "systems/colonial-weather/templates/actor/parts/header.hbs" },
    tabs: { template: "systems/colonial-weather/templates/actor/parts/tabs.hbs" },
    attributes: { template: "systems/colonial-weather/templates/actor/parts/attributes.hbs" },
    skills: { template: "systems/colonial-weather/templates/actor/parts/skills.hbs" },
    backgrounds: { template: "systems/colonial-weather/templates/actor/parts/backgrounds.hbs" },
    bio: { template: "systems/colonial-weather/templates/actor/parts/bio.hbs" }
  };

  tabGroups = {
    sheet: "attributes"
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;

    context.actor = this.document;
    context.activeTab = this.tabGroups.sheet;
    
    // FIX: Use a distinct name for the editable state
    context.isEditable = this.isEditable;

    // FIX: TextEditor Namespace & Safety Checks
    context.enriched = {
        merits: await foundry.applications.ux.TextEditor.enrichHTML(system.bio.merits || "", {async: true}),
        flaws: await foundry.applications.ux.TextEditor.enrichHTML(system.bio.flaws || "", {async: true}),
        notes: await foundry.applications.ux.TextEditor.enrichHTML(system.bio.notes || "", {async: true})
    };

    context.attrOptions = CONFIG.CW.attributes.physical
        .concat(CONFIG.CW.attributes.social)
        .concat(CONFIG.CW.attributes.mental)
        .reduce((acc, key) => {
            acc[key] = key.toUpperCase();
            return acc;
        }, {});

    const healthLevels = system.health.levels || [0,0,0,0,0,0,0];
    context.healthConfig = CONFIG.CW.healthLevels.map((l, i) => {
        return {
            label: l.label,
            penalty: l.penalty,
            index: i,
            checked: healthLevels[i] > 0
        };
    });

    context.tabs = [
      { id: "attributes", group: "sheet", icon: "fa-solid fa-user", label: "Attributes" },
      { id: "skills", group: "sheet", icon: "fa-solid fa-dice-d20", label: "Skills" },
      { id: "backgrounds", group: "sheet", icon: "fa-solid fa-briefcase", label: "Backgrounds" },
      { id: "bio", group: "sheet", icon: "fa-solid fa-book", label: "Bio" }
    ];

    context.config = CONFIG.CW;
    context.system = system;
    return context;
  }

  static async _onChangeTab(event, target) {
    const group = target.dataset.group;
    const tab = target.dataset.tab;
    this.tabGroups[group] = tab;
    this.render();
  }

  static async _onRollAttribute(event, target) {
    const key = target.dataset.attr;
    this.document.rollDicePool(key);
  }

  static async _onRollSkill(event, target) {
    const key = target.dataset.key;
    const skill = this.document.system.skills[key];
    this.document.rollDicePool(skill.attr, key);
  }

  static async _onToggleSpecialized(event, target) {
    const key = target.dataset.key;
    const current = this.document.system.skills[key].specialized;
    await this.document.update({[`system.skills.${key}.specialized`]: !current});
  }
  
  static async _onRollHitLocation(event, target) {
    const r = await new Roll("1d10").evaluate();
    const map = {1:"Head", 2:"Chest", 3:"Stomach", 4:"Stomach", 5:"Right Leg", 6:"Left Leg", 7:"Right Leg", 8:"Left Leg", 9:"Right Arm", 10:"Left Arm"};
    const loc = map[r.total];
    await r.toMessage({ flavor: `Hit Location: ${loc}` });
    await this.document.update({"system.health.location": loc});
  }
}