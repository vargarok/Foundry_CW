// scripts/rules/effects.js
function* iterEffectBundles(it) {
  const sys = it.system ?? {};
  const flags = it.flags?.["colonial-weather"] ?? {};
  if (Array.isArray(sys.effects))   yield sys.effects;
  if (Array.isArray(sys.onUse))     yield sys.onUse;
  if (Array.isArray(flags.effects)) yield flags.effects; // fallback
}

export function collectRollMods(actor, context) {
  // Added difficulty (tn) and auto-successes to output
  const out = { dicePool: 0, initiative: 0, difficulty: 0, successes: 0, sources: [] };
  const tags = new Set(context?.tags ?? []);
  
  for (const it of actor.items ?? []) {
    // Skip if item is equipped/implanted but marked 'inactive' (future proofing)
    if (it.system?.equipped === false) continue;

    for (const arr of iterEffectBundles(it)) {
      for (const eff of arr) {
        if (!eff?.mods) continue;
        // Handle CSV tags if they haven't been parsed yet
        if (eff.when?.tagsCsv && !eff.when?.tags) {
          eff.when.tags = eff.when.tagsCsv.split(",").map(s => s.trim()).filter(Boolean);
        }
        
        // Check conditions
        const rollOk = !eff.when?.rollType || eff.when.rollType === context.rollType;
        const tagsOk = !eff.when?.tags?.length || eff.when.tags.every(t => tags.has(t));
        if (!rollOk || !tagsOk) continue;

        // Apply modifiers
        let active = false;
        for (const m of eff.mods) {
          const v = Number(m?.value) || 0;
          // We only support 'add' op for now, but structure allows for 'override' or 'multiply' later
          if (m.op === "add") {
             if (m.path === "dicePool")   { out.dicePool += v; active = true; }
             if (m.path === "initiative") { out.initiative += v; active = true; }
             if (m.path === "difficulty") { out.difficulty += v; active = true; }
             if (m.path === "successes")  { out.successes += v; active = true; }
          }
        }
        if (active) out.sources.push(eff.label || it.name);
      }
    }
  }
  return out;
}