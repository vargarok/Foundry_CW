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
    // Robustly get the raw DOM element whether it's jQuery or HTMLElement
    const root = html instanceof HTMLElement ? html : (html[0] || html);
    
    // 1. Create the Datalist
    const datalistId = "cw-effect-keys";
    let datalist = root.querySelector(`#${datalistId}`);
    
    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = datalistId;
        
        // Populate options from CONFIG.CW.effectOptions
        // Ensure CW.effectOptions exists in your config.mjs!
        if (CONFIG.CW.effectOptions) {
            for (const [key, label] of Object.entries(CONFIG.CW.effectOptions)) {
                const option = document.createElement("option");
                option.value = key;
                option.label = label;
                datalist.appendChild(option);
            }
        }
        root.append(datalist);
    }

    // 2. Attach to all "Change Key" inputs
    // Looks for inputs named "changes.0.key", "changes.1.key", etc.
    const inputs = root.querySelectorAll('input[name^="changes"][name$="key"]');
    
    inputs.forEach(input => {
        input.setAttribute("list", datalistId);
        input.placeholder = "Select or Type...";
        // Optional: Force it to autocomplete off so the browser doesn't hide our datalist
        input.setAttribute("autocomplete", "off");
    });
});

  preloadHandlebarsTemplates();
});