export class CWActor extends Actor {

  prepareDerivedData() {
    const system = this.system;
    
    // --- 1. Initialize Skills ---
    system.skills = system.skills || {};

    for (const [key, data] of Object.entries(CONFIG.CW.skills)) {
      // If skill doesn't exist, create it
      if (!system.skills[key]) {
        system.skills[key] = { 
            value: 0, 
            label: data.label, 
            specialized: false, 
            attr: data.attr // Use default from config
        }; 
      } else {
        // If it exists, update label and ensure attr exists
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
    system.derived.gravityMod = gMods;

    // Effective Attributes
    system.derived.attributes = {};
    for (let [key, attr] of Object.entries(system.attributes)) {
      let mod = 0;
      if (["str", "dex", "sta"].includes(key)) mod = gMods[key] || 0;
      system.derived.attributes[key] = Math.max(0, (attr.value || 1) + mod);
    }

    const effStr = system.derived.attributes.str;
    const effDex = system.derived.attributes.dex;
    const effWit = system.derived.attributes.wit;

    // --- 4. Derived Stats ---
    system.derived.initiative = effDex + effWit;
    system.derived.moveWalk = 7;
    system.derived.moveRun = effDex + 12;
    system.derived.moveSprint = (effDex * 3) + 20;
    system.derived.throwRange = effStr * 12;

    // --- 5. Health Penalties ---
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

  async rollDicePool(attributeKey, skillKey=null, bonus=0) {
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
    
    if (woundPen === 99) {
       pool = 0;
    } else {
       pool += woundPen;
    }

    pool = Math.max(0, pool);
    
    if (pool === 0) {
        ChatMessage.create({ content: `<strong>${this.name}</strong> cannot act (Dice pool 0 or Incapacitated).` });
        return;
    }

    const formula = isSpecialized ? `${pool}d10x10cs>=7` : `${pool}d10cs>=7`;
    const roll = await new Roll(formula).evaluate();
    const isBotch = (roll.total === 0 && roll.dice[0].results.some(d => d.result === 1));

    const label = skillName ? `${skillName} (${attributeKey.toUpperCase()})` : attributeKey.toUpperCase();
    const content = await renderTemplate("systems/colonial-weather/templates/chat/roll.hbs", {
      roll,
      isBotch,
      label,
      isSpecialized,
      woundPen
    });

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [roll]
    });
  }
}