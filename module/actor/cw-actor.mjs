
export class CWActor extends Actor {
  /** Compute derived data each prep. */
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system;

    // Gravity modifiers (STR/DEX/STA)
    const home = (s.bio.gravityHome || "Normal").toLowerCase();
    const here = (s.bio.gravityCurrent || "Normal").toLowerCase();
    const g = this._gravityMods(home, here);
    s.derived = s.derived || {};
    // Effective attributes (do not overwrite base, just compute temp)
    const eff = {
      str: (s.attributes.str.value || 0) + g.str,
      dex: (s.attributes.dex.value || 0) + g.dex,
      sta: (s.attributes.sta.value || 0) + g.sta
    };
    // Initiative: DEX + WIT
    s.derived.initiative = eff.dex + (s.attributes.wit.value || 0);
    // Movement: Walk 7m, Run dex+12, Sprint dex*3+20 (from rules)
    s.derived.moveWalk = 7;
    s.derived.moveRun = eff.dex + 12;
    s.derived.moveSprint = eff.dex*3 + 20;
    // Throw range STR*12
    s.derived.throwRange = eff.str * 12;
  }

  _gravityMods(home, here) {
    // Table from Colonial Weather rules: modifications str/dex/sta
    const table = {
      "zero":   {"zero":[0,0,0], "low":[+1,-1,0], "normal":[+2,-1,0], "high":[+3,-2,+2]},
      "low":    {"zero":[-1,0,-1], "low":[0,0,0], "normal":[+1,0,0], "high":[+2,-1,+2]},
      "normal": {"zero":[-2,+1,-2], "low":[-1,0,-1], "normal":[0,0,0], "high":[+1,0,+1]},
      "high":   {"zero":[-3,+2,-3], "low":[-2,+1,-2], "normal":[-1,0,-1], "high":[0,0,0]}
    };
    const arr = (table[home]?.[here]) || [0,0,0];
    return {str:arr[0], dex:arr[1], sta:arr[2]};
  }
}
