export class CWActor extends Actor {

  prepareDerivedData() {
    const system = this.system;
    
    // --- 1. Initialize Skills if missing ---
    for (const [key, label] of Object.entries(CONFIG.CW.skills)) {
      if (!system.skills[key]) {
        system.skills[key] = { value: 0, label: label, specialized: false, attr: "dex" }; // Default attr, can be changed
      } else {
        system.skills[key].label = label; // Ensure label matches config
      }
    }

    // --- 2. Initialize Backgrounds if missing ---
    for (const [key, label] of Object.entries(CONFIG.CW.backgrounds)) {
      if (!system.backgrounds[key]) {
        system.backgrounds[key] = { value: 0, label: label };
      } else {
        system.backgrounds[key].label = label;
      }
    }

    // --- 3. Gravity Mods (Table from Character Creation PDF pg 6) ---
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

    // --- 4. Derived Stats (Page 6) ---
    // Initiative: DEX + WIT
    system.derived.initiative = effDex + effWit;

    // Movement
    // Crawl 2m, Walk 7m, Run DEX+12, Sprint DEX*3+20
    system.derived.moveWalk = 7;
    system.derived.moveRun = effDex + 12;
    system.derived.moveSprint = (effDex * 3) + 20;

    // Throwing Range: STR * 12
    system.derived.throwRange = effStr * 12;

    // --- 5. Health Penalties ---
    // Calculate penalty based on the lowest filled health box
    let penalty = 0;
    const levels = system.health.levels || [0,0,0,0,0,0,0];
    
    // Check levels from Incapacitated (bottom) up to Bruised
    // If a severe level is marked (1), apply that penalty
    // We map index 0..6 to the CONFIG penalties
    for (let i = 6; i >= 0; i--) {
      if (levels[i] > 0) { // If box is marked
        penalty = CONFIG.CW.healthLevels[i].penalty;
        break; 
      }
    }
    system.health.penalty = penalty;
  }

  _getGravityMods(home, here) {
    // Matrix derived from PDF Page 6
    const map = {
      "zero":   {"zero":[0,0,0], "low":[+1,-1,0], "normal":[+2,-1,0], "high":[+3,-2,+2]},
      "low":    {"zero":[-1,0,-1], "low":[0,0,0], "normal":[+1,0,0], "high":[+2,-1,+2]},
      "normal": {"zero":[-2,+1,-2], "low":[-1,0,-1], "normal":[0,0,0], "high":[+1,0,+1]},
      "high":   {"zero":[-3,+2,-3], "low":[-2,+1,-2], "normal":[-1,0,-1], "high":[0,0,0]}
    };
    // Default to 0 if not found
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

    // Apply Wound Penalty
    let pool = attrVal + skillVal + bonus;
    const woundPen = system.health.penalty;
    if (woundPen !== 99) { // 99 is incapacitated
        pool += woundPen; 
    } else {
        pool = 0; // Can't act
    }

    pool = Math.max(0, pool);
    
    if (pool === 0) {
        // Optional: Handle chance die or automatic fail
        ChatMessage.create({content: "Pool reduced to 0. Cannot roll."});
        return;
    }

    // Rule: Success on 7+. If specialized, 10s explode.
    const formula = isSpecialized ? `${pool}d10x10cs>=7` : `${pool}d10cs>=7`;
    
    const roll = await new Roll(formula).evaluate();
    
    // Botch Rule: 0 successes AND at least one '1'
    const isBotch = (roll.total === 0 && roll.dice[0].results.some(d => d.result === 1));

    // Chat Message
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