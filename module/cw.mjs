import { CW } from "./config.mjs";
import { CWActor } from "./documents/actor.mjs";
import { CWItem } from "./documents/item.mjs";
import { CWActorSheet } from "./sheets/actor-sheet.mjs";
import { CWItemSheet } from "./sheets/item-sheet.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";

Hooks.once("init", function() {
  console.log("Colonial Weather | Initializing System");

  game.cw = {
    CWActor,
    CWItem
  };

  CONFIG.CW = CW;
  CONFIG.Actor.documentClass = CWActor;
  CONFIG.Item.documentClass = CWItem;
  // Define the Initiative Formula
  // 1d10 + Derived Initiative
  // We use "decimals: 2" to break ties (higher static initiative wins)
  CONFIG.Combat.initiative = {
    formula: "1d10 + @derived.initiative",
    decimals: 2
  };

  Handlebars.registerHelper('array', function() {
    // The arguments object contains all parameters passed to the helper
    // We slice off the last argument which is the Handlebars options object
    return Array.prototype.slice.call(arguments, 0, -1);
  });
  Handlebars.registerHelper('multiply', function(a, b) {
      return Number(a) * Number(b);
  });

  // Register Sheets (V13 Strict Mode)
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  
  foundry.documents.collections.Actors.registerSheet("colonial-weather", CWActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "Colonial Weather Actor"
  });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  
  foundry.documents.collections.Items.registerSheet("colonial-weather", CWItemSheet, {
    makeDefault: true,
    label: "Colonial Weather Item"
  });

Hooks.on("renderActiveEffectConfig", (app, html, data) => {
    const root = html instanceof HTMLElement ? html : (html[0] || html);
    
    // 1. Create the Datalist
    const datalistId = "cw-effect-keys";
    let datalist = root.querySelector(`#${datalistId}`);
    
    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = datalistId;
        
        const config = CONFIG.CW.effectOptions;

        if (config) {
            // Loop through each Category (Attributes, Skills, etc.)
            for (const category of Object.values(config)) {
                
                // A. Add a "Header" option (Visual separator)
                // We use a dummy value so it doesn't break things if selected by accident
                if (category.label) {
                    const header = document.createElement("option");
                    header.value = ""; 
                    header.label = category.label; 
                    header.disabled = true; // Hints to browser not to select it
                    datalist.appendChild(header);
                }

                // B. Add the actual items
                for (const [key, label] of Object.entries(category.items)) {
                    const option = document.createElement("option");
                    option.value = key;
                    option.label = label;
                    datalist.appendChild(option);
                }
            }
        }
        root.append(datalist);
    }

    // 2. Attach to inputs (Same as before)
    const inputs = root.querySelectorAll('input[name^="changes"][name$="key"]');
    inputs.forEach(input => {
        input.setAttribute("list", datalistId);
        input.placeholder = "Select Attribute...";
        input.setAttribute("autocomplete", "off");
    });
});

Hooks.on("renderChatMessageHTML", (message, html, data) => {
    // html is now a native HTMLElement, not a jQuery object.
    // We use querySelector instead of .find()
    const damageButton = html.querySelector("button[data-action='roll-damage']");
    
    if (damageButton) {
        damageButton.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation(); // Stop event bubbling
            const button = ev.currentTarget;
            
            // 1. Get Button Data
            const damageFormula = button.dataset.damage; 
            const type = button.dataset.type;            
            const location = button.dataset.location || "chest"; 

            // 2. Roll Damage
            const roll = await new Roll(`${damageFormula}d10cs>=6`).evaluate();
            const damageSuccesses = roll.total;

            // 3. Show the Roll Result
            await roll.toMessage({
                flavor: `<span style="color:darkred; font-weight:bold">Damage Roll (${type}): ${damageSuccesses} Successes</span>`
            });

            // 4. CHECK FOR TARGETS
            const targets = game.user.targets;
            
            if (targets.size === 0) {
                ui.notifications.warn("Damage rolled, but no tokens were targeted to apply it to.");
                return;
            }

            // 5. Apply to Targets
            for (const token of targets) {
                if (token.actor) {
                    await token.actor.applyDamage(damageSuccesses, location, type);
                }
            }
        });
    }
});

// --- COMBAT TURN AUTOMATION ---
Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
    if (!game.user.isGM) return;
    if (!updateData.round && !updateData.turn) return;

    const combatant = combat.combatant;
    if (!combatant || !combatant.actor) return;

    const actor = combatant.actor;
    let turnSkipped = false;

    // 1. CHECK FOR INCAPACITATION (Unconscious / Dead)
    if (actor.statuses.has("unconscious") || actor.statuses.has("dead") || actor.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) {
        ChatMessage.create({
            content: `<div style="padding: 5px; background: #3c0000; color: #fff; font-weight: bold; border: 1px solid red;">
                <i class="fas fa-skull"></i> ${actor.name} is Incapacitated and skips their turn.
            </div>`
        });
        turnSkipped = true;
    }

    // 2. CHECK FOR STUN
    // Stun typically lasts 1 turn (next action). 
    // We skip this turn, then REMOVE the stun so they can act next round.
    else if (actor.statuses.has("stun")) {
        ChatMessage.create({
            content: `<div style="padding: 5px; background: #444; color: #ffff00; font-weight: bold; border: 1px solid yellow;">
                <i class="fas fa-bolt"></i> ${actor.name} is Stunned! Turn skipped.
            </div>`
        });
        
        // Remove Stun Effect
        await actor.toggleStatusEffect("stun", { active: false });
        turnSkipped = true;
    }

    // 3. CHECK FOR BLEEDING (Apply Damage)
    const bleedingEffect = actor.effects.find(e => e.name === "Bleeding" || e.img === "icons/svg/blood.svg");
    if (bleedingEffect && !actor.statuses.has("dead")) {
        const currentTotal = actor.system.health.total.value;
        const newTotal = currentTotal - 1;
        
        await actor.update({ "system.health.total.value": newTotal });

        ChatMessage.create({
            content: `<div style="background: #3c0000; color: #ffcccc; padding: 5px; border: 1px solid darkred; font-size: 0.9em;">
                        <i class="fas fa-tint"></i> <strong>${actor.name}</strong> bleeds! (1 Dmg)
                      </div>`,
            speaker: ChatMessage.getSpeaker({ actor: actor })
        });
        
        // Bleed Out Logic
        if (newTotal < 0 && !actor.statuses.has("unconscious")) {
             await actor.toggleStatusEffect("unconscious", { overlay: true });
        }
    }

    // 4. EXECUTE SKIP
    // We add a small delay to ensure the chat message appears first and DB updates finish
    if (turnSkipped) {
        setTimeout(() => {
            combat.nextTurn();
        }, 500); 
    }
});

  preloadHandlebarsTemplates();
});