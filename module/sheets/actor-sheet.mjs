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
      changeTab: this._onChangeTab,
      createItem: this._onCreateItem,
      editItem: this._onEditItem,
      rollInitiative: this._onRollInitiative,
      deleteItem: this._onDeleteItem,
      rollWeapon: this._onRollWeapon,
      createEffect: this._onCreateEffect,
      editEffect: this._onEditEffect,
      deleteEffect: this._onDeleteEffect,
      toggleEffect: this._onToggleEffect,
      useItem: this._onUseItem
    }
  };

  static PARTS = {
    header: { template: "systems/colonial-weather/templates/actor/parts/header.hbs" },
    tabs: { template: "systems/colonial-weather/templates/actor/parts/tabs.hbs" },
    attributes: { template: "systems/colonial-weather/templates/actor/parts/attributes.hbs" },
    skills: { template: "systems/colonial-weather/templates/actor/parts/skills.hbs" },
    backgrounds: { template: "systems/colonial-weather/templates/actor/parts/backgrounds.hbs" },
    bio: { template: "systems/colonial-weather/templates/actor/parts/bio.hbs" },
    inventory: { template: "systems/colonial-weather/templates/actor/parts/inventory.hbs" },
    effects: { template: "systems/colonial-weather/templates/parts/active-effects.hbs" }
  };

  tabGroups = {
    sheet: "attributes"
  };

  async _prepareContext(options) {
    // 1. Get the base context
    const context = await super._prepareContext(options);
    const system = this.document.system;

    // 1.1 Get the Raw Source Data (The "Base" values before Active Effects)
    const source = this.document.toObject(); 
    context.sourceAttributes = source.system.attributes;

    // 2. Prepare basic Actor data
    context.actor = this.document;
    context.activeTab = this.tabGroups.sheet;
    context.config = CONFIG.CW;
    context.system = system;
    
    // 3. Dropdown Options for Attributes
    context.attrOptions = CONFIG.CW.attributes.physical
        .concat(CONFIG.CW.attributes.social)
        .concat(CONFIG.CW.attributes.mental)
        .reduce((acc, key) => {
            acc[key] = key.toUpperCase();
            return acc;
        }, {});

    // 4. Health Config
    const healthLevels = system.health.levels || [0,0,0,0,0,0,0];
    context.healthConfig = CONFIG.CW.healthLevels.map((l, i) => {
        return {
            label: l.label,
            penalty: l.penalty,
            index: i,
            checked: healthLevels[i] > 0
        };
    });

    // 5. Prepare Inventory (Categorize Items)
    const inventory = {
      weapons: [],
      armor: [],
      gear: [],
      cybernetics: [],
      traits: []
    };

    // Loop through all items on the actor and sort them
    for (const i of this.document.items) {
      if (i.type === "weapon") inventory.weapons.push(i);
      else if (i.type === "armor") inventory.armor.push(i);
      else if (i.type === "cybernetic") inventory.cybernetics.push(i);
      else if (i.type === "trait") inventory.traits.push(i);
      else inventory.gear.push(i); // Fallback for any other type
    }
    
    context.inventory = inventory;

    // 6. Define Tabs (Included Inventory directly here to avoid the error)
    context.tabs = [
      { id: "attributes", group: "sheet", icon: "fa-solid fa-user", label: "Attributes" },
      { id: "skills", group: "sheet", icon: "fa-solid fa-dice-d20", label: "Skills" },
      { id: "inventory", group: "sheet", icon: "fa-solid fa-backpack", label: "Inventory" },
      { id: "effects", group: "sheet", icon: "fa-solid fa-bolt", label: "Effects" },
      { id: "backgrounds", group: "sheet", icon: "fa-solid fa-briefcase", label: "Backgrounds" },
      { id: "bio", group: "sheet", icon: "fa-solid fa-book", label: "Bio" }
    ];

    // 7. Prepare Active Effects (Aggregated from Actor AND Items)
    const effects = [];

    // A. Direct Actor Effects (Temporary buffs, debuffs, or manual adds)
    for (const e of this.document.effects) {
        effects.push({
            id: e.id,
            name: e.name,
            img: e.img,
            disabled: e.disabled,
            sourceName: "Actor (Temporary)",
            isItemEffect: false // Flag to know we can edit/delete directly
        });
    }

    // B. Transfer Effects from Items (Equipment, Merits, Cybernetics)
    for (const item of this.document.items) {
        for (const e of item.effects) {
            // Only show effects that are intended to transfer (Passive Buffs)
            if (e.transfer) {
                effects.push({
                    id: e.id,
                    name: e.name,
                    img: e.img,
                    disabled: e.disabled,
                    sourceName: item.name,
                    isItemEffect: true, // Flag to disable direct delete (must edit item)
                    itemId: item.id     // Link back to item
                });
            }
        }
    }
    
    context.effects = effects;

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

  static async _onRollInitiative(event, target) {
    // Call the helper on the actor
    this.document.rollInitiativeDialog();
  }
  
  static async _onRollHitLocation(event, target) {
    const r = await new Roll("1d10").evaluate();
    const map = {1:"Head", 2:"Chest", 3:"Stomach", 4:"Stomach", 5:"Right Leg", 6:"Left Leg", 7:"Right Leg", 8:"Left Leg", 9:"Right Arm", 10:"Left Arm"};
    const loc = map[r.total];
    await r.toMessage({ flavor: `Hit Location: ${loc}` });
    await this.document.update({"system.health.location": loc});
  }
  static async _onCreateItem(event, target) {
    const type = target.dataset.type;
    await Item.create({name: `New ${type}`, type: type}, {parent: this.document});
}

  static async _onEditItem(event, target) {
    const item = this.document.items.get(target.dataset.id);
    item.sheet.render(true);
}

  static async _onDeleteItem(event, target) {
    const item = this.document.items.get(target.dataset.id);
    await item.delete();
}

  static async _onRollWeapon(event, target) {
    event.preventDefault();
    const item = this.document.items.get(target.dataset.id);
    const system = item.system;

    // 1. Determine Attack Modes from ROF
    // If ROF is "1/3", this creates [1, 3]
    let rofString = String(system.rof || "1");
    let modes = rofString.split('/').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (modes.length === 0) modes = [1];

    // 2. Check if weapon uses ammo
    const useAmmo = system.ammo.max > 0;
    
    // If we have options OR need to confirm ammo usage, show a Dialog
    if (useAmmo || modes.length > 1) {
        
        const content = await renderTemplate("systems/colonial-weather/templates/chat/attack-dialog.hbs", {
            modes: modes,
            hasAmmo: useAmmo,
            ammo: system.ammo.value
        });

        new Dialog({
            title: `Attack: ${item.name}`,
            content: content,
            buttons: {
                attack: {
                    label: "Attack",
                    icon: '<i class="fas fa-crosshairs"></i>',
                    callback: async (html) => {
                        const form = html[0].querySelector("form");
                        const selectedModeIndex = form.mode ? form.mode.value : 0;
                        const shotCount = modes[selectedModeIndex];
                        
                        // Ammo Check
                        if (useAmmo) {
                            if (system.ammo.value < shotCount) {
                                ui.notifications.warn("Not enough ammo!");
                                return;
                            }
                            // Deduct Ammo
                            await item.update({"system.ammo.value": system.ammo.value - shotCount});
                        }

                        // Determine Bonus
                        // (You can add logic here: e.g., if shotCount > 1, add +1 dice per extra bullet)
                        const bonus = Number(system.attackBonus) || 0; 

                        // Perform Roll
                        this.document.rollDicePool(system.attribute, system.skill, bonus, item);
                    }
                }
            },
            default: "attack"
        }).render(true);

    } else {
        // Simple Roll (Melee or No-Ammo Weapon)
        const bonus = Number(system.attackBonus) || 0;
        this.document.rollDicePool(system.attribute, system.skill, bonus, item);
    }
  }

  static async _onCreateEffect(event, target) {
    return ActiveEffect.create({
        name: "New Effect",
        icon: "icons/svg/aura.svg",
        origin: this.document.uuid,
        disabled: false
    }, { parent: this.document });
}

  static async _onEditEffect(event, target) {
    const effect = this.document.effects.get(target.closest(".item-row").dataset.effectId);
    return effect.sheet.render(true);
}

  static async _onDeleteEffect(event, target) {
    const effect = this.document.effects.get(target.closest(".item-row").dataset.effectId);
    return effect.delete();
}

  static async _onToggleEffect(event, target) {
    const effect = this.document.effects.get(target.closest(".item-row").dataset.effectId);
    return effect.update({ disabled: !effect.disabled });
}
  static async _onUseItem(event, target) {
    const item = this.document.items.get(target.dataset.id);
    if (!item) return;

    // 1. Check if it has effects to apply
    if (item.effects.size === 0) {
        ui.notifications.warn(`${item.name} has no effects to apply!`);
        return;
    }

    // 2. Prepare effects for copying
    // We toggle 'transfer' to false so they become specific to the Actor
    // We also set the origin so we know where it came from later
    const effectsData = item.effects.map(e => {
        const data = e.toObject();
        data.transfer = false; 
        data.origin = item.uuid;
        data.name = `${e.name} (${item.name})`; // Helpful labeling
        return data;
    });

    // 3. Create the effects on the Actor
    await this.document.createEmbeddedDocuments("ActiveEffect", effectsData);
    ui.notifications.info(`Applied effects from ${item.name}`);

    // 4. Consume the Item
    const qty = item.system.quantity || 1;
    if (qty > 1) {
        await item.update({"system.quantity": qty - 1});
    } else {
        await item.delete();
    }
  }
}