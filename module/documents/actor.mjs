export class CWActor extends Actor {

  prepareDerivedData() {
    const system = this.system;
    
    // --- 1. Initialize Skills ---
    system.skills = system.skills || {};

    const total = system.experience.total || 0;
    const spent = system.experience.spent || 0;
    system.experience.unspent = total - spent;

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
    if (!system.health.levels) system.health.levels = [0,0,0,0,0,0,0];
    const levels = system.health.levels;
    
    for (let i = 6; i >= 0; i--) {
      if (levels[i] > 0) { 
        penalty = CONFIG.CW.healthLevels[i].penalty;
        break; 
      }
    }
    system.health.penalty = penalty;

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
    const woundPen = system.health.penalty;
    
    // --- Formula Generation for Chat ---
    let formula = `${CONFIG.CW.attributeLabels[attributeKey] || attributeKey.toUpperCase()}`;
    if (skillName) formula += ` + ${skillName}`;
    if (bonus !== 0) formula += ` + ${bonus} (Bonus)`;
    if (woundPen !== 0) formula += ` - ${Math.abs(woundPen)} (Pain)`;
    // -----------------------------------

    if (woundPen === 99) {
       pool = 0;
    } else {
       pool += woundPen;
    }

    if (system.development.isCreation) {
        this._calculateCreationPoints(system);
    }

    pool = Math.max(0, pool);
    
    if (pool === 0) {
        ChatMessage.create({ content: `<strong>${this.name}</strong> cannot act (Dice pool 0 or Incapacitated).` });
        return;
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

    // --- ARMOR DESTRUCTION LOGIC ---
    let armorMsg = "";
    if (armor > 0 && damageSuccesses > (2 * armor)) {
        // Find armor items on this location
        const armorItems = this.items.filter(i => 
            i.type === "armor" && 
            i.system.equipped && 
            i.system.coverage.includes(location)
        );

        if (armorItems.length > 0) {
            const targetArmor = armorItems[0];

            /* --- OPTION A: STRICT RULES (Instant Destruction) --- 
            await targetArmor.update({
                "system.equipped": false,
                "name": `${targetArmor.name} (Destroyed)`
            });
            armorMsg = `<div style="color: #ff4a4a; font-weight: bold; margin-top:5px;">
                <i class="fas fa-shield-alt"></i> ARMOR DESTROYED!
            </div>`;
            */

            // --- OPTION B: ABLATIVE (Current House Rule) ---
            const newSoak = Math.max(0, targetArmor.system.soak - 1);
            await targetArmor.update({
                "system.soak": newSoak,
                "name": `${targetArmor.name} (Damaged)`
            });
            armorMsg = `<div style="color: #ff8c00; font-size:0.85em; margin-top:5px;">
                <i class="fas fa-shield-alt" style="color:red;"></i> Armor Degraded! (-1 Soak)
            </div>`;
            // ------------------------------------------------
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

        // --- MASSIVE DAMAGE THRESHOLD ---
        const isMassiveDamage = finalDamage > 7;

        // --- UPDATE HP VALUES ---
        const currentLocHP = locData.value;
        const currentTotal = system.health.total.value;
        const maxTotal = system.health.total.max;

        const damageToTotal = Math.max(0, Math.min(finalDamage, currentLocHP));

        let newLocHP = currentLocHP - finalDamage;
        const newTotal = currentTotal - damageToTotal;

        // Force Limb Destruction on Massive Damage
        if (isMassiveDamage && newLocHP > -1) newLocHP = -1;

        // --- UPDATE VISUAL HEALTH TRACK ---
        const totalBoxes = 7 + (system.health.bonusLevels || 0);
        const hpPerBox = maxTotal / totalBoxes;
        
        const totalDamageTaken = maxTotal - newTotal;
        let boxesToFill = Math.min(totalBoxes, Math.ceil(totalDamageTaken / hpPerBox));

        // --- FIX: PERSIST INCAPACITATION ---
        // Check if vital destroyed OR massive damage OR already unconscious/dead
        const isDestroyedHP = newLocHP < 0;
        const isVital = ["head", "chest", "stomach"].includes(location);
        
        // We check 'statuses' to see if they were ALREADY out of the fight.
        const isAlreadyDown = this.statuses.has("unconscious") || 
                              this.statuses.has(CONFIG.specialStatusEffects.DEFEATED) ||
                              this.statuses.has("dead");

        if (isMassiveDamage || (isVital && isDestroyedHP) || isAlreadyDown) {
            boxesToFill = totalBoxes; // Force Full Track
        }

        // --- ARRAY HANDLING ---
        let rawLevels = system.health.levels;
        if (rawLevels && !Array.isArray(rawLevels)) rawLevels = Object.values(rawLevels);
        const currentLevels = rawLevels || [];
        while (currentLevels.length < totalBoxes) currentLevels.push(0);
        
        const newLevels = [...currentLevels];
        
        let typeCode = 1; // Bashing
        if (type === "lethal") typeCode = 2;
        if (type === "aggravated") typeCode = 3;

        for (let i = 0; i < totalBoxes; i++) {
            if (newLevels[i] === undefined) newLevels[i] = 0;
            if (i < boxesToFill) {
                if (newLevels[i] < typeCode) newLevels[i] = typeCode;
            } else {
                newLevels[i] = 0;
            }
        }

        // Apply Updates
        await this.update({
            [`system.health.locations.${location}.value`]: newLocHP,
            "system.health.total.value": newTotal,
            "system.health.levels": newLevels
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