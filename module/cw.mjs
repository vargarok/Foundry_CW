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

  // --- ADD THIS BLOCK ---
  Handlebars.registerHelper('array', function() {
    // The arguments object contains all parameters passed to the helper
    // We slice off the last argument which is the Handlebars options object
    return Array.prototype.slice.call(arguments, 0, -1);
  });
  // ----------------------

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

  preloadHandlebarsTemplates();
});