
// Colonial Weather System for Foundry VTT v13
import { CWActor } from "./actor/cw-actor.mjs";
import { CWItem } from "./item/cw-item.mjs";

export const CW = {};

CW.ATTR_ORDER = ["str","dex","sta","cha","soc","app","int","edu","wit"];

CW.GRAVITIES = ["Zero","Low","Normal","High"];

CW.SKILLS = {
  athletics: "Athletics",
  awareness: "Awareness",
  brawl: "Brawl",
  business: "Business",
  computerUse: "Computer Use",
  demolitions: "Demolitions",
  disguise: "Disguise",
  drive: "Drive",
  empathy: "Empathy",
  engineering: "Engineering",
  etiquette: "Etiquette",
  firearms: "Firearms",
  forgery: "Forgery",
  gambling: "Gambling",
  gatherInformation: "Gather Information",
  heavyWeapons: "Heavy Weapons",
  intimidate: "Intimidate",
  leadership: "Leadership",
  linguistics: "Linguistics",
  martialArts: "Martial Arts",
  medicine: "Medicine",
  melee: "Melee",
  navigation: "Navigation",
  perform: "Perform",
  pilot: "Pilot",
  repair: "Repair",
  security: "Security",
  stealth: "Stealth",
  streetwise: "Streetwise",
  subterfuge: "Subterfuge",
  survival: "Survival",
  technology: "Technology"
};

Handlebars.registerHelper('eq', (a,b)=>a===b);

Hooks.once("init", function() {
  console.log("Colonial Weather | Initializing");
  CONFIG.Actor.documentClass = CWActor;
  CONFIG.Item.documentClass = CWItem;

  // Register sheets
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("colonial-weather", CWCharacterSheet, { types: ["character"], makeDefault: true, label: game.i18n.localize("CW.Character") });
  Actors.registerSheet("colonial-weather", CWNPCSheet, { types: ["npc"], makeDefault: false, label: game.i18n.localize("CW.NPC") });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("colonial-weather", CWItemSheet, { makeDefault: true });

  // Make helpers available
  game.cw = {
    rollPool
  }
});

/** Dice pool rolling per Colonial Weather rules.
 * Success on 7-10. If specialized, 10s re-roll and add.
 * Botch: 0 successes and at least one 1.
 */
export async function rollPool({actor, pool=1, title="", specialized=false, willpower=false}) {
  const rolls = [];
  let successes = willpower ? 1 : 0;
  let ones = 0;
  let resultsStr = [];
  let toRoll = pool;
  while (toRoll > 0) {
    const r = new Roll("1d10").roll({async:false});
    const v = r.total;
    rolls.push(v);
    resultsStr.push(v);
    if (v >= 7) {
      successes += 1;
      if (specialized && v === 10) {
        toRoll += 1; // explode
        resultsStr[resultsStr.length-1] = `${v}⇶`; // indicate re-roll
      }
    } else if (v === 1) {
      ones += 1;
    }
    toRoll -= 1;
  }
  const botch = successes === 0 && ones > 0;
  const templ = "systems/colonial-weather/templates/chat/dice-roll.hbs";
  const html = await renderTemplate(templ, {
    title: title || game.i18n.localize("CW.Roll"),
    dicePool: pool,
    specialized,
    willpower,
    results: resultsStr.join(", "),
    successes,
    botch
  });
  ChatMessage.create({content: html, type: CONST.CHAT_MESSAGE_TYPES.OTHER, speaker: ChatMessage.getSpeaker({actor}), flags: {cw: {successes, botch, rolls}}});
  return {successes, botch, rolls};
}

// Simple hit location (1-10): 1 head, 2 chest, 3-4 stomach, 5,7 right leg, 6,8 left leg, 9 right arm, 10 left arm
export function rollHitLocation() {
  const r = new Roll("1d10").roll({async:false}).total;
  const map = {1: "Head", 2:"Chest", 3:"Stomach", 4:"Stomach", 5:"Right leg", 6:"Left leg", 7:"Right leg", 8:"Left leg", 9:"Right arm", 10:"Left arm"};
  return {value: r, label: map[r] || r};
}

class CWBaseSheet extends ActorSheet {
  get template() {
    return "systems/colonial-weather/templates/actor/character-sheet.hbs";
  }
  async getData(options) {
    const data = await super.getData(options);
    data.gravities = CW.GRAVITIES;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".skills button").on("click", ev => {
      const key = ev.currentTarget.dataset.skill;
      const sk = this.actor.system.skills[key];
      // Default attribute pairing: pick a likely attribute based on skill family or let user choose via prompt
      const defaultAttrs = ["dex","int","wit","cha","str","soc","edu","sta","app"];
      let attr = defaultAttrs.includes(key) ? key : null;
      if (!attr) {
        // crude mapping
        const map = {
          athletics:"str", awareness:"wit", brawl:"str", business:"soc",
          computerUse:"int", demolitions:"int", disguise:"app", drive:"dex",
          empathy:"cha", engineering:"int", etiquette:"soc", firearms:"dex",
          forgery:"int", gambling:"wit", gatherInformation:"wit",
          heavyWeapons:"dex", intimidate:"cha", leadership:"cha", linguistics:"edu",
          martialArts:"dex", medicine:"int", melee:"dex", navigation:"int",
          perform:"app", pilot:"dex", repair:"int", security:"int",
          stealth:"dex", streetwise:"wit", subterfuge:"wit", survival:"wit", technology:"int"
        };
        attr = map[key] || "int";
      }
      const a = this.actor.system.attributes[attr]?.value ?? 0;
      const pool = a + (sk?.value ?? 0);
      const title = `${sk.label} (${attr.toUpperCase()} + ${sk.label})`;
      const spendWP = ev.shiftKey && (this.actor.system.willpower?.value > 0);
      if (spendWP) {
        this.actor.update({"system.willpower.value": this.actor.system.willpower.value - 1});
      }
      rollPool({actor:this.actor, pool, title, specialized: !!sk.specialized, willpower: spendWP});
    });

    html.find("button.hitloc").on("click", ev => {
      const {value, label} = rollHitLocation();
      this.actor.update({"system.health.location": value});
      ui.notifications?.info(`Hit location: ${label} (${value})`);
    });
  }
}

class CWCharacterSheet extends CWBaseSheet { }
class CWNPCSheet extends CWBaseSheet { }

// Register sheets globally
globalThis.CWCharacterSheet = CWCharacterSheet;
globalThis.CWNPCSheet = CWNPCSheet;
globalThis.rollPool = rollPool;
