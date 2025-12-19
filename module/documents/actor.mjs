export class CWActor extends Actor {

/** @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    // Set default token/avatar images if none are provided
    if (!data.img || data.img === this.constructor.DEFAULT_ICON) {
      const defaultImg = this.type === "npc" 
        ? "systems/colonial-weather/assets/npc-default.svg" 
        : "systems/colonial-weather/assets/character-default.svg"; // Make sure these files exist!
      
      this.updateSource({ img: defaultImg });
    }

    // Optional: Set default Prototype Token settings (like linking characters)
    if (this.type === "character") {
      this.updateSource({ 
        "prototypeToken.actorLink": true,
        "prototypeToken.disposition": 1 // Friendly
      });
    }
  }

prepareBaseData() {
    const system = this.system;

    // --- 1. Initialize Skills ---
    system.skills = system.skills || {};

    for (const [key, data] of Object.entries(CONFIG.CW.skills)) {
      if (!system.skills[key]) {
        system.skills[key] = { 
            value: 0, 
            label: data.label, 
            specialized: false, 
            attr: data.attr 
        }; 
      } else {
        system.skills[key].label = data.label; 
        if (!system.skills[key].attr) {
            system.skills[key].attr = data.attr;
        }
      }
    }

    // --- 2. Initialize Backgrounds ---
    system.backgrounds = system.backgrounds || {};
    for (const [key, label] of Object.entries(CONFIG.CW.backgrounds)) {
      if (!system.backgrounds[key]) {
        system.backgrounds[key] = { value: 0, label: label };
      } else {
        system.backgrounds[key].label = label;
      }
    }
  }

get woundPenalty() {
    return this.system.health.penalty || 0;
}

  prepareDerivedData() {
    const system = this.system;
    

    // XP Calculation
    const total = system.experience.total || 0;
    const spent = system.experience.spent || 0;
    system.experience.unspent = total - spent;

    // --- 3. Gravity Mods ---
    const home = (system.bio.gravityHome || "Normal").toLowerCase();
    const current = (system.bio.gravityCurrent || "Normal").toLowerCase();
    const gMods = this._getGravityMods(home, current);
    
    // --- 4. Calculate Cybernetic Immune Load ---
    let totalLoad = 0;
    for (const item of this.items) {
      if (item.type === "cybernetic" && item.system.active) {
        totalLoad += (item.system.immuneLoad || 0);
      }
    }
    system.derived.immuneLoad = totalLoad;

    // Calculate Penalty
    const rawSta = system.attributes.sta.value || 1; 
    let immunePenalty = 0;
    
    if (totalLoad > (rawSta * 3)) {
        immunePenalty = -2 - (Math.floor((totalLoad - (rawSta * 3)) / rawSta)); 
    } else if (totalLoad > (rawSta * 2)) {
        immunePenalty = -1;
    }
    
    system.derived.immunePenalty = immunePenalty;

    // --- 5. Apply Mods to Attributes (MERGED BLOCK) ---
    // We calculate this ONCE to avoid overwriting data
    system.derived.attributes = {};
    
    for (let [key, attr] of Object.entries(system.attributes)) {
      let mod = 0;
      
      // A. Apply Gravity Mods (Physical Only)
      if (["str", "dex", "sta"].includes(key)) {
          mod += (gMods[key] || 0);
      }
      
      // B. Apply Immune System Penalty (Stamina Only)
      if (key === "sta" && immunePenalty !== 0) {
          mod += immunePenalty;
      }
      
      // Calculate Effective Value (Minimum 0)
      system.derived.attributes[key] = Math.max(0, (attr.value || 1) + mod);
    }

    // --- 6. Derived Stats ---
    // Use the effective (derived) attributes for these calculations
    const effStr = system.derived.attributes.str;
    const effDex = system.derived.attributes.dex;
    const effWit = system.derived.attributes.wit;

    // Initiative
    system.derived.initiative = effDex + effWit + (system.derived.initBonus || 0);

    // Movement (Now using moveBonus)
    const moveBonus = (system.derived.moveBonus || 0);
    system.derived.moveWalk = 7 + moveBonus;
    system.derived.moveRun = effDex + 12 + moveBonus;
    system.derived.moveSprint = (effDex * 3) + 20 + moveBonus;
    system.derived.throwRange = effStr * 12;

    // --- 7. Health Penalties ---
    let penalty = 0;
    let label = "Healthy";

    // Ensure levels exist
    if (!system.health.levels) system.health.levels = [0,0,0,0,0,0,0];
    const levels = system.health.levels;

    // Loop backwards to find the highest filled box
    // (0=Bruised ... 6=Incapacitated)
    for (let i = 6; i >= 0; i--) {
    // If the box has damage (1=Bashing, 2=Lethal, 3=Aggravated), apply this level's penalty
    if (levels[i] > 0) { 
        const levelData = CONFIG.CW.healthLevels[i];
        penalty = levelData.penalty;
        label = levelData.label;
        break; 
    }
    }

    system.health.penalty = penalty;
    system.health.statusLabel = label; // Useful for displaying "Mauled" on the sheet

    // --- 8. Calculate Armor Soak per Location ---
    if (system.health.locations) {
        
        // Reset armor to 0
        for (const loc of Object.values(system.health.locations)) {
            loc.armor = 0;
        }

        // Loop Armor
        for (const item of this.items) {
            // Check TYPE, EQUIPPED status, and Coverage ARRAY
            if (item.type === "armor" && item.system.equipped && item.system.coverage) {
                const soak = Number(item.system.soak) || 0;
                
                // Add soak to each covered location
                for (const locKey of item.system.coverage) {
                    if (system.health.locations[locKey]) {
                        system.health.locations[locKey].armor += soak;
                    }
                }
            }
        }
      }

    // --- 9. Calculate Total Hit Points ---
    // Summing max HP from all locations to get Total Max
    if (system.health.locations) {
        let maxTotal = 0;
        for (const loc of Object.values(system.health.locations)) {
            maxTotal += (loc.max || 0);
        }
        
        // Add the Global Bonus
        maxTotal += (system.health.total.bonus || 0);

        // Ensure total exists (if you just added it to template)
        if (!system.health.total) system.health.total = { value: 0, max: 0 };
        system.health.total.max = maxTotal;
        
        // Optional: If value is null/undefined (new actor), set it to max
        if (system.health.total.value === null || system.health.total.value === undefined) {
            system.health.total.value = maxTotal;
        }
    }
    // --- XP / Point Calculation ---
    let xpSpent = 0;
    let freebiesSpent = 0;
    
    // 1. Calculate Attributes Cost
    // (Logic: Sum all dots. Subtract 1 (free dot). Multiply by cost)
    for (const attr of Object.values(this.system.attributes)) {
        // Simple logic: Cost is 5 per dot (example)
        xpSpent += (attr.value - 1) * 5; 
    }

    // 2. Calculate Skills Cost
    for (const skill of Object.values(this.system.skills)) {
        xpSpent += skill.value * 2; // Example cost
    }

    // 3. Calculate Backgrounds/Merits (Items)
    for (const item of this.items) {
        if (item.type === "background") {
            xpSpent += item.system.cost; // 1 pt per dot?
        }
        if (item.type === "trait") {
            // Merits cost freebies, Flaws give freebies
            // You'll need logic to distinguish
        }
    }

  }

  _calculateCreationPoints(system) {
      // 1. attributes (Cost: 1 per dot over 1)
      const attrUsage = { physical: 0, social: 0, mental: 0 };
      
      for (const [key, attr] of Object.entries(system.attributes)) {
          const group = this._getAttributeGroup(key); // Helper needed
          if (group) {
              // Subtract 1 because everyone starts with 1 dot for free
              attrUsage[group] += Math.max(0, attr.value - 1);
          }
      }
      system.development.attributes = attrUsage;

      // 2. Skills (Cost: 1 per dot)
      let skillCost = 0;
      for (const skill of Object.values(system.skills)) {
          skillCost += skill.value;
          // Specialized costs handled in Freebies usually, or separate pool
      }
      system.development.skills = skillCost;

      // 3. Backgrounds (From Items)
      let bgCost = 0;
      for (const item of this.items) {
          if (item.type === "background") {
              bgCost += (item.system.cost || 0);
          }
      }
      system.development.backgrounds = bgCost;

      // 4. Merits/Flaws (Freebie Math)
      let meritCost = 0;
      let flawBonus = 0;
      for (const item of this.items) {
          if (item.type === "trait") {
              const cost = item.system.cost || 0;
              if (item.system.type === "merit") meritCost += cost;
              else if (item.system.type === "flaw") flawBonus += cost;
          }
      }
      
      // Calculate remaining Freebies
      // Start with 15, Add Flaw Bonus (Max 7 usually), Subtract Merits
      // You can add logic here to deduct "Overspent" attributes from freebies if you wish
      const maxFlawBonus = 7; // Cap returned points from flaws
      const actualFlawBonus = Math.min(flawBonus, maxFlawBonus);
      
      system.development.freebies.spent = meritCost;
      system.development.freebies.gained = actualFlawBonus;
      system.development.freebies.remaining = 15 + actualFlawBonus - meritCost;
  }

  _getAttributeGroup(key) {
      if (CONFIG.CW.attributes.physical.includes(key)) return "physical";
      if (CONFIG.CW.attributes.social.includes(key)) return "social";
      if (CONFIG.CW.attributes.mental.includes(key)) return "mental";
      return null;
  }

  _getGravityMods(home, here) {
    const map = {
      "zero":   {"zero":[0,0,0], "low":[+1,-1,0], "normal":[+2,-1,0], "high":[+3,-2,+2]},
      "low":    {"zero":[-1,0,-1], "low":[0,0,0], "normal":[+1,0,0], "high":[+2,-1,+2]},
      "normal": {"zero":[-2,+1,-2], "low":[-1,0,-1], "normal":[0,0,0], "high":[+1,0,+1]},
      "high":   {"zero":[-3,+2,-3], "low":[-2,+1,-2], "normal":[-1,0,-1], "high":[0,0,0]}
    };
    const res = (map[home]?.[here]) || [0,0,0];
    return {str: res[0], dex: res[1], sta: res[2]};
  }

  /**
   * Heal damage based on time and care quality.
   * @param {string} type "bashing" or "lethal"
   * @param {number} amount Number of levels to heal
   * @returns {Promise<number>} The number of levels actually healed
   */
  async recoverHealth(type, amount) {
      const system = this.system;
      let levels = system.health.levels;
      if (levels && !Array.isArray(levels)) levels = Object.values(levels);
      levels = levels || [];

      // Create a working copy
      const newLevels = [...levels];
      let healedCount = 0;

      const targetCode = (type === "lethal") ? 2 : 1;

      for (let h = 0; h < amount; h++) {
          let foundIndex = -1;
          
          // Find the last occurrence of the specific damage type
          // (Heals the "lightest" wound of that type first)
          for (let i = newLevels.length - 1; i >= 0; i--) {
              if (newLevels[i] === targetCode) {
                  foundIndex = i;
                  break;
              }
          }

          if (foundIndex > -1) {
              newLevels[foundIndex] = 0; // Clear the box
              healedCount++;
          } else {
              break; 
          }
      }

      // Re-Sort to keep wounds packed to the left (Agg > Lethal > Bashing)
      newLevels.sort((a, b) => b - a);

      if (healedCount > 0) {
          // Update Actor
          await this.update({ "system.health.levels": newLevels });
          
          // Check if we are healthy enough to remove Incapacitated/Dead statuses
          let penalty = 0;
          for (let i = 6; i >= 0; i--) {
              if (newLevels[i] > 0) { 
                  penalty = CONFIG.CW.healthLevels[i].penalty;
                  break; 
              }
          }

          if (penalty < 99) {
              if (this.statuses.has("unconscious")) await this.toggleStatusEffect("unconscious", { active: false });
              if (this.statuses.has("dead")) await this.toggleStatusEffect("dead", { active: false });
          }

          ChatMessage.create({
              content: `<div style="color:green; font-weight:bold;">
                  <i class="fas fa-heart"></i> ${this.name} recovered ${healedCount} levels of ${type} damage.
              </div>`
          });
      } 
      
      // Removed the 'else' block here to prevent notification spam
      
      return healedCount;
  }

  async rollInitiativeDialog() {
    // 1. Check if we are in a Combat encounter
    const combatant = this.getCombatant();
    
    if (!combatant) {
        ui.notifications.warn(`${this.name} is not in the Combat Tracker!`);
        return;
    }

    // 2. Roll Initiative using the system config
    await combatant.combat.rollInitiative([combatant.id]);
}

// Helper to find the combatant for this actor
getCombatant() {
    if (!game.combat) return null;
    return game.combat.combatants.find(c => c.actorId === this.id);
}

  async rollDicePool(attributeKey, skillKey=null, bonus=0, item=null) {
    const system = this.system;
    
    let attrVal = system.derived.attributes[attributeKey] || 0;
    let skillVal = 0;
    let skillName = "";
    let isSpecialized = false;

    if (skillKey) {
      const sk = system.skills[skillKey];
      skillVal = sk.value;
      skillName = sk.label;
      isSpecialized = sk.specialized;
    }

    let pool = attrVal + skillVal + bonus;
    const woundPen = this.woundPenalty;
    
    // --- Formula Generation for Chat ---
    let formula = `${CONFIG.CW.attributeLabels[attributeKey] || attributeKey.toUpperCase()}`;
    if (skillName) formula += ` + ${skillName}`;
    if (bonus !== 0) formula += ` + ${bonus} (Bonus)`;
    if (woundPen !== 0) formula += ` - ${Math.abs(woundPen)} (Pain)`;
    // -----------------------------------

    // Check for Incapacitation
    if (woundPen <= -99) {
       ui.notifications.warn(`${this.name} is Incapacitated and cannot act!`);
       return; // Stop the roll
    }

    // Apply Penalty (Subtracting the absolute value)
    // We check if (woundPen !== 0) to avoid printing "-0"
    if (woundPen !== 0) {
        pool += woundPen; // woundPen is negative (e.g., -2), so we add it
        
        // Update the formula string for the chat message
        formula += ` - ${Math.abs(woundPen)} (Wounds)`;
    }

    const rollExpression = isSpecialized ? `${pool}d10x10cs>=7` : `${pool}d10cs>=7`;
    const roll = await new Roll(rollExpression).evaluate();
    const isBotch = (roll.total === 0 && roll.dice[0].results.some(d => d.result === 1));

    // Determine the Main Label (Item Name OR Skill Name)
    const label = item ? item.name : (skillName ? `${skillName} Roll` : `${attributeKey.toUpperCase()} Roll`);
    const img = item ? item.img : null; // Get icon if available

    const content = await foundry.applications.handlebars.renderTemplate("systems/colonial-weather/templates/chat/roll.hbs", {
      roll,
      isBotch,
      label,
      formula, // Pass the formula string
      img,     // Pass the icon
      isSpecialized,
      woundPen
    });

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [roll]
    });

    return roll;
  }

  /**
   * Apply damage to this actor, accounting for armor at the hit location.
   * Update Hit Points AND the Visual Health Track.
   * @param {number} damageSuccesses - The raw damage count.
   * @param {string} location - The body part hit (e.g., "torso", "head").
   * @param {string} type - "lethal", "bashing", or "aggravated".
   */
  async applyDamage(damageSuccesses, location = "chest", type = "lethal") {
    const system = this.system;
    
    // 1. Calculate Soak (Armor + Stamina)
    const locData = system.health.locations[location] || { armor: 0, value: 0 };
    const armor = locData.armor || 0;
    const stamina = system.attributes.sta.value || 0;
    const soak = armor + stamina; 

    // --- ABLATIVE ARMOR LOGIC ---
    let armorMsg = "";
    if (armor > 0 && damageSuccesses > (2 * armor)) {
        const armorItems = this.items.filter(i => 
            i.type === "armor" && 
            i.system.equipped && 
            i.system.coverage.includes(location)
        );

        if (armorItems.length > 0) {
            const targetArmor = armorItems[0];
            
            await targetArmor.update({
                "system.equipped": false,
                "name": `${targetArmor.name} (Destroyed)`
            });
            armorMsg = `<div style="color: #ff4a4a; font-weight: bold; margin-top:5px;">
                <i class="fas fa-shield-alt"></i> ARMOR DESTROYED!
            </div>`;
        }
    }

    // 2. Calculate Final Raw Damage
    const finalDamage = Math.max(0, damageSuccesses - soak);

    // 3. Prepare Chat Data
    let flavorColor = "#777";
    let flavorText = "Soaked!";
    
    if (finalDamage > 0) {
        flavorColor = "#ff4a4a";
        flavorText = `${finalDamage} ${type.toUpperCase()} Damage`;

        const isMassiveDamage = finalDamage > 7;

        // --- UPDATE HP VALUES ---
        const currentLocHP = locData.value;
        const currentTotal = system.health.total.value;
        const maxTotal = system.health.total.max;

        const damageToTotal = Math.max(0, Math.min(finalDamage, currentLocHP));

        let newLocHP = currentLocHP - finalDamage;
        const newTotal = currentTotal - damageToTotal;

        if (isMassiveDamage && newLocHP > -1) newLocHP = -1;

        // --- UPDATE VISUAL HEALTH TRACK (SORTING LOGIC) ---
        const totalBoxes = 7 + (system.health.bonusLevels || 0);
        const hpPerBox = maxTotal / totalBoxes;
        
        // A. Calculate how many NEW boxes this specific hit is worth
        // (We calculate against the 'damageToTotal' to ensure we don't add boxes for overkill limb damage that didn't hurt the body)
        // However, standard WoD usually counts the full impact severity for the track.
        // Let's use damageToTotal for consistency with the HP bar.
        const boxesAdded = Math.ceil(damageToTotal / hpPerBox);

        // B. Get Existing Levels (Array Safe)
        let levels = system.health.levels;
        if (levels && !Array.isArray(levels)) levels = Object.values(levels);
        levels = levels || [];
        
        // Clean existing levels (remove 0s for sorting)
        let activeWounds = levels.filter(l => l > 0);

        // C. Define Damage Type Code
        let typeCode = 1; // Bashing
        if (type === "lethal") typeCode = 2;
        if (type === "aggravated") typeCode = 3;

        // D. Add New Wounds
        for (let i = 0; i < boxesAdded; i++) {
            activeWounds.push(typeCode);
        }

        // E. Sort: Aggravated (3) > Lethal (2) > Bashing (1)
        activeWounds.sort((a, b) => b - a);

        // F. Handle Overflow (Incapacitation)
        // If we have more wounds than boxes, the excess are "lost" visually but the track is full.
        // (Realistically, Bashing might convert to Lethal here, but let's keep it simple: Full is Full).
        if (activeWounds.length > totalBoxes) {
            activeWounds = activeWounds.slice(0, totalBoxes);
        }

        // G. Force Incapacitation Override
        // If vital destroyed or massive damage, fill EVERYTHING with at least Lethal (or current type)
        const isDestroyedHP = newLocHP < 0;
        const isVital = ["head", "chest", "stomach"].includes(location);
        
        // Check if already down to preserve state
        const isAlreadyDown = this.statuses.has("unconscious") || 
                              this.statuses.has(CONFIG.specialStatusEffects.DEFEATED) ||
                              this.statuses.has("dead");

        if (isMassiveDamage || (isVital && isDestroyedHP) || isAlreadyDown) {
            // Fill any empty slots with the current damage type (or Lethal minimum)
            while (activeWounds.length < totalBoxes) {
                activeWounds.push(Math.max(2, typeCode)); 
            }
            // Re-sort to be safe
            activeWounds.sort((a, b) => b - a);
        }

        // H. Reconstruct Full Array (Pad with 0s)
        const finalLevels = [...activeWounds];
        while (finalLevels.length < totalBoxes) finalLevels.push(0);

        // Apply Updates
        await this.update({
            [`system.health.locations.${location}.value`]: newLocHP,
            "system.health.total.value": newTotal,
            "system.health.levels": finalLevels
        });

        // --- 5. AUTOMATED STATUS EFFECTS ---
        
        // A. STUN CHECK
        if (finalDamage >= stamina) {
            const stunId = "stun"; 
            if (!this.statuses.has(stunId)) {
                await this.toggleStatusEffect(stunId, { overlay: false });
                ChatMessage.create({ content: `<strong>${this.name}</strong> is <strong>Stunned</strong>!` });
            }
        }

        // B. DEFEATED (Dead)
        if (isVital && (isDestroyedHP || isMassiveDamage)) {
            const deadId = CONFIG.specialStatusEffects.DEFEATED || "dead";
            if (!this.statuses.has(deadId)) {
                await this.toggleStatusEffect(deadId, { overlay: true });
                ChatMessage.create({ content: `<strong>${this.name}</strong> suffers a fatal injury to the ${location}!` });
            }
        }

        // C. UNCONSCIOUS (Incapacitated)
        else if (newTotal < 0 || isMassiveDamage) {
            const unconsciousId = "unconscious"; 
            if (!this.statuses.has(unconsciousId)) {
                 await this.toggleStatusEffect(unconsciousId, { overlay: true }); 
                 ChatMessage.create({ content: `<strong>${this.name}</strong> is Incapacitated!` });
            }
        }

        // D. BLEEDING
        const isLimb = ["rArm", "lArm", "rLeg", "lLeg"].includes(location);
        if (isLimb && (newLocHP < 0 || isMassiveDamage)) {
            const bleedingIcon = "icons/svg/blood.svg"; 
            const hasBleeding = this.effects.some(e => e.name === "Bleeding" || e.img === bleedingIcon);

            if (!hasBleeding) {
                await this.createEmbeddedDocuments("ActiveEffect", [{
                    name: "Bleeding",
                    img: bleedingIcon,
                    origin: this.uuid,
                    description: "Losing 1 HP per turn.",
                    duration: { rounds: 100 }
                }]);
                ChatMessage.create({ content: `<strong>${this.name}</strong>'s ${location} is destroyed! They are <strong>Bleeding</strong>.` });
            }
        }

        // --- OPTIONAL: CHAT TEXT UPDATES ---
        if (newLocHP < 0) {
            flavorText += `<br><span style="font-size:0.8em; color:darkred;">⚠️ ${location.toUpperCase()} DESTROYED!</span>`;
        }
    }

    // 4. Send Chat Card
    ChatMessage.create({
        content: `
            <div class="cw-chat-card" style="border-top: 3px solid ${flavorColor}; padding: 5px; background: rgba(0,0,0,0.1);">
                <h3 style="border-bottom: 1px solid #555; margin-bottom: 5px; font-size:1.1em;">
                    ${this.name}: ${finalDamage > 0 ? "Hit!" : "No Damage"}
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; font-size: 0.9em; gap: 2px;">
                    <strong>Location:</strong> <span>${location.toUpperCase()}</span>
                    <strong>Raw Dmg:</strong> <span>${damageSuccesses}</span>
                    <strong>Soak:</strong> <span>-${soak}</span>
                    <strong>HP Left:</strong> <span>${system.health.total.value - (finalDamage > 0 ? (Math.max(0, Math.min(finalDamage, locData.value))) : 0)} / ${system.health.total.max}</span>
                </div>
                ${armorMsg}
                <hr style="margin: 5px 0; border-color: #555;">
                <div style="text-align: center; font-size: 1.2em; font-weight: bold; color: ${flavorColor};">
                    ${flavorText}
                </div>
            </div>
        `
    });
  }

    async spendXP(type, key) {
      const system = this.system;
      const xpCostMap = CONFIG.CW.xpCosts; // Ensure this exists in config.mjs
      
      let currentVal = 0;
      let cost = 0;
      let path = "";

      if (type === "attribute") {
          currentVal = system.attributes[key].value;
          cost = currentVal * (xpCostMap.raiseAttribute || 5); // Default x5
          path = `system.attributes.${key}.value`;
      } 
      else if (type === "skill") {
          currentVal = system.skills[key].value;
          if (currentVal === 0) cost = (xpCostMap.newSkill || 3);
          else cost = currentVal * (xpCostMap.raiseSkill || 2);
          path = `system.skills.${key}.value`;
      }

      // Check if affordability
      if (system.experience.unspent < cost) {
          ui.notifications.warn(`Not enough XP! Need ${cost}, have ${system.experience.unspent}`);
          return;
      }

      // Update Actor
      await this.update({
          [path]: currentVal + 1,
          "system.experience.spent": (system.experience.spent || 0) + cost
      });
      
      ui.notifications.info(`Spent ${cost} XP to raise ${key}.`);
  }
}