export class CWActor extends Actor {

  prepareData() {
    super.prepareData();
  }

  prepareDerivedData() {
    const system = this.system;
    
    // Initialize skills if empty (first run)
    if (foundry.utils.isEmpty(system.skills)) {
      for (const [key, data] of Object.entries(CONFIG.CW.defaultSkills)) {
        system.skills[key] = { 
          value: 0, 
          label: data.label, 
          attr: data.attr, 
          specialized: false 
        };
      }
    }

    // Gravity Calculation
    const home = (system.bio.gravityHome || "Normal").toLowerCase();
    const current = (system.bio.gravityCurrent || "Normal").toLowerCase();
    const mods = this._getGravityMods(home, current);
    
    system.derived.gravityMod = mods;
    
    // Effective Attributes (Base + Gravity)
    system.derived.attributes = {};
    for (let [key, attr] of Object.entries(system.attributes)) {
      let mod = 0;
      if (["str", "dex", "sta"].includes(key)) mod = mods[key] || 0;
      system.derived.attributes[key] = (attr.value || 1) + mod;
    }
  }

  _getGravityMods(home, here) {
    // Simplified mapping logic
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

    const pool = Math.max(1, attrVal + skillVal + bonus);
    
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
      isSpecialized
    });

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [roll]
    });
  }
}