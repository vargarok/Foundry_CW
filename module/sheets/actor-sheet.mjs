const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { DialogV2 } = foundry.applications.api; // <--- V13 Requirement

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
      useItem: this._onUseItem,
      editImage: this._onEditImage,
      toggleHealth: this._onToggleHealth,
      toggleEditMode: this._onToggleEditMode,
      spendXP: this._onSpendXP,
      resetXP: this._onResetXP,
      reloadWeapon: this._onReloadWeapon
    }
  };

  static PARTS = {
    header: { template: "systems/colonial-weather/templates/actor/parts/header.hbs" },
    tabs: { template: "systems/colonial-weather/templates/actor/parts/tabs.hbs" },
    attributes: { template: "systems/colonial-weather/templates/actor/parts/attributes.hbs" },
    combat: { template: "systems/colonial-weather/templates/actor/parts/combat.hbs" },
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
    const context = await super._prepareContext(options);
    const system = this.document.system;
    const source = this.document.toObject().system; // Raw DB data

    // --- NEW: Pre-calculate Attributes for Display ---
    // This replaces the complex template logic and fixes the "0" bug
    const attributes = {};
    const groups = {
        physical: CONFIG.CW.attributes.physical,
        social: CONFIG.CW.attributes.social,
        mental: CONFIG.CW.attributes.mental
    };

    // Helper to build the display object
    const buildAttr = (key) => {
        const base = source.attributes[key].value;
        const eff = system.derived.attributes[key]; // Calculated in Actor.mjs
        return {
            key: key,
            label: system.attributes[key].label,
            base: base,
            effective: eff,
            isModified: base !== eff,
            cssClass: eff < base ? "color:var(--cw-fail);" : "color:var(--cw-success);"
        };
    };

    // Build lists for the template
    context.viewAttributes = {
        physical: groups.physical.map(buildAttr),
        social: groups.social.map(buildAttr),
        mental: groups.mental.map(buildAttr)
    };

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

    // 4. Health Config (Updated for Top-Loading Bonus Levels)
    const healthLevels = system.health.levels || [];
    const bonusLevels = system.health.bonusLevels || 0;
    const standardConfig = CONFIG.CW.healthLevels;
    
    const damageClasses = {
        0: "", 1: "bashing", 2: "lethal", 3: "aggravated"
    };
    // UPDATED: Icons to Letters
    const damageIcons = {
        0: "", 1: "B", 2: "L", 3: "A"
    };

    // A. Generate Standard Levels (Indices 0 to 6)
    const standardList = standardConfig.map((l, i) => {
        const state = healthLevels[i] || 0;
        return {
            label: l.label,
            penalty: l.penalty,
            index: i, // Matches system.health.levels[0-6]
            state: state,
            cssClass: damageClasses[state],
            icon: damageIcons[state]
        };
    });

    // B. Generate Bonus Levels (Indices 7+)
    // These will be "Bruised" levels with 0 penalty
    const bonusList = [];
    for (let i = 0; i < bonusLevels; i++) {
        const dataIndex = standardConfig.length + i; // Starts at 7
        const state = healthLevels[dataIndex] || 0;
        
        bonusList.push({
            label: "Bruised", // Clean label
            penalty: 0,
            index: dataIndex, // Matches system.health.levels[7+]
            state: state,
            cssClass: damageClasses[state],
            icon: damageIcons[state]
        });
    }

    // C. Combine: Bonus First, then Standard
    context.healthConfig = [...bonusList, ...standardList];

    // 5. Prepare Inventory (Categorize Items)
    const inventory = {
      weapons: [],
      armor: [],
      gear: [],
      cybernetics: [],
      traits: [],
      backgrounds: []
    };

    // Loop through all items on the actor and sort them
    for (const i of this.document.items) {
      if (i.type === "weapon") inventory.weapons.push(i);
      else if (i.type === "armor") inventory.armor.push(i);
      else if (i.type === "cybernetic") inventory.cybernetics.push(i);
      else if (i.type === "trait") inventory.traits.push(i);
      else if (i.type === "background") inventory.backgrounds.push(i);
      else inventory.gear.push(i); // Fallback for any other type
    }
    
    context.inventory = inventory;

    // 6. Define Tabs (Included Inventory directly here to avoid the error)
    context.tabs = [
      { id: "attributes", group: "sheet", icon: "fa-solid fa-user", label: "Attributes" },
      { id: "combat", group: "sheet", icon: "fa-solid fa-heart-pulse", label: "Combat" },
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

  static async _onToggleEditMode(event, target) {
      const actor = this.document;
      await actor.update({"system.editMode": !actor.system.editMode});
  }

  static async _onSpendXP(event, target) {
      const type = target.dataset.type; // 'attribute' or 'skill'
      const key = target.dataset.key;   // 'str' or 'firearms'
      
      // Optional: Add a confirmation Dialog here if you want
      await this.document.spendXP(type, key);
  }

  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    
    const fp = new FilePicker({
        type: "image",
        current: current,
        callback: path => {
            this.document.update({[attr]: path});
        },
        top: this.position.top + 40,
        left: this.position.left + 10
    });
    return fp.browse();
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

  // --- UPDATED WEAPON ROLL (V13 COMPLIANT) ---
  static async _onRollWeapon(event, target) {
    event.preventDefault();
    const item = this.document.items.get(target.dataset.id);
    const system = item.system;

    // 1. Parse ROF (Supports "1", "1/3", "1/3/10", "1/3/Auto")
    let rofString = String(system.rof || "1");
    let modes = rofString.split('/').map(s => {
        const clean = s.trim().toLowerCase();
        if (clean === "auto" || clean === "a") return "Auto";
        return parseInt(clean) || 1;
    });

    // 2. Dialog
    const useAmmo = system.ammo.max > 0;
    
    // Default values if no dialog
    let shotCount = 1;
    let bonus = Number(system.attackBonus) || 0;

    if (useAmmo || modes.length > 1) {
        // FIX: Namespaced renderTemplate
        const content = await foundry.applications.handlebars.renderTemplate("systems/colonial-weather/templates/chat/attack-dialog.hbs", {
            modes: modes,
            hasAmmo: useAmmo,
            ammo: system.ammo.value
        });

        // FIX: DialogV2 Wait
        const result = await DialogV2.wait({
            window: { title: `Attack: ${item.name}`, icon: "fa-solid fa-crosshairs" },
            content: content,
            buttons: [{
                action: "attack",
                label: "Attack",
                icon: "fa-solid fa-crosshairs",
                callback: (event, button, dialog) => {
                    const form = dialog.element.querySelector("form");
                    // Using FormDataExtended to grab the select value safely
                    return new FormDataExtended(form).object;
                }
            }],
            close: () => null
        });

        if (!result) return; // User closed dialog

        const selectedIdx = result.mode;
        const modeVal = modes[selectedIdx];
        
        // Determine Shot Count
        if (modeVal === "Auto") shotCount = 10;
        else shotCount = Number(modeVal);

        // Ammo Check
        if (useAmmo) {
            if (system.ammo.value < shotCount) {
                ui.notifications.warn(`Click-click! Not enough ammo. Need ${shotCount}, have ${system.ammo.value}.`);
                return;
            }
            await item.update({"system.ammo.value": system.ammo.value - shotCount});
        }

        // Determine Bonus
        if (shotCount === 3) bonus += 1; 
        if (shotCount >= 10) bonus += 3;
    }

    // Execute Roll
    this.document.rollDicePool(system.attribute, system.skill, bonus, item);
  }

  // --- NEW RELOAD LOGIC ---
  static async _onReloadWeapon(event, target) {
      event.preventDefault();
      const item = this.document.items.get(target.dataset.id);
      const needed = item.system.ammo.max - item.system.ammo.value;

      if (needed <= 0) {
          ui.notifications.info("Weapon is already full.");
          return;
      }

      // 1. Find the Magazine (Gear)
      const ammoType = item.system.ammoType;
      if (!ammoType) {
          ui.notifications.warn("No 'Ammo Type' defined for this weapon. Edit the Item to specify what magazine it uses.");
          return;
      }

      // Case-insensitive search for gear with that name
      const magItem = this.document.items.find(i => 
          i.type === "gear" && 
          i.name.toLowerCase() === ammoType.toLowerCase()
      );

      if (!magItem) {
          ui.notifications.warn(`Reload failed: Could not find any Gear named "${ammoType}".`);
          return;
      }

      // 2. Deduct Magazine
      const currentQty = magItem.system.quantity || 0;
      if (currentQty < 1) {
          ui.notifications.warn(`You are out of ${magItem.name}!`);
          return;
      }

      // 3. Update Data (Refill Weapon, Reduce Gear)
      await item.update({"system.ammo.value": item.system.ammo.max});
      
      if (currentQty === 1) {
          await magItem.update({"system.quantity": 0});
      } else {
          await magItem.update({"system.quantity": currentQty - 1});
      }

      ui.notifications.info(`Reloaded ${item.name} using ${magItem.name}.`);
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
  static async _onToggleHealth(event, target) {
    event.preventDefault();
    const index = parseInt(target.dataset.index);
    const levels = this.document.system.health.levels;
    
    // Get current value (default to 0)
    const current = levels[index] || 0;
    
    // Cycle: 0 -> 1 -> 2 -> 3 -> 0
    const next = (current + 1) > 3 ? 0 : current + 1;

    // Create the update path dynamically
    await this.document.update({[`system.health.levels.${index}`]: next});
  }

  // --- UPDATED RESET XP (V13 COMPLIANT) ---
  static async _onResetXP(event, target) {
      // FIX: DialogV2 Confirm
      const confirmed = await DialogV2.confirm({
          window: { title: "Reset XP History?" },
          content: "<p>This will set 'Spent XP' to 0. Use this if you want to recalculate costs or reset the character. This cannot be undone.</p>",
          rejectClose: false
      });

      if (confirmed) {
          await this.document.update({ "system.experience.spent": 0 });
          ui.notifications.info("XP Spending History reset to 0.");
      }
  }
}