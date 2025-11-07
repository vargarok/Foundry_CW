
// colonial-weather.js
class CWActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["cw", "sheet", "actor"],
      template: "systems/colonial-weather/templates/actor/character-sheet.hbs",
      width: 720, height: 640,
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "core"}]
    });
  }
  getData(options) {
    const context = super.getData(options);
    context.system = this.actor.system;
    return context;
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".cw-roll").on("click", ev => this._onRoll(ev));
  }
  async _onRoll(ev) {
    ev.preventDefault();
    const form = this.element;
    const attr = form.find("select[name='cw-attr']").val() || "dex";
    const skill = form.find("select[name='cw-skill']").val() || "athletics";
    const specialized = form.find("input[name='cw-spec']")[0]?.checked || false;

    const aVal = Number(this.actor.system.attributes[attr] || 0);
    const sVal = Number(this.actor.system.skills[skill] || 0);
    const wound = Number(this.actor.system.vitals.wound_pen || 0);
    let dice = Math.max(0, aVal + sVal - Math.abs(wound));
    if (dice <= 0) { ui.notifications.warn("Dice pool is 0 or less."); dice = 1; }

    const roll = await (new Roll(`${dice}d10`)).evaluate({async:true});
    const faces = roll.dice[0].results.map(r => r.result);
    let successes = faces.filter(n => n >= 7).length;
    const ones = faces.filter(n => n === 1).length;

    if (specialized) {
      const tens = faces.filter(n => n === 10).length;
      if (tens > 0) {
        const rr = await (new Roll(`${tens}d10`)).evaluate({async:true});
        const extra = rr.dice[0].results.map(r => r.result);
        successes += extra.filter(n => n >= 7).length;
        roll._evaluated = true;
        roll.terms.push(rr.terms[0]);
      }
    }
    const botch = successes === 0 && ones > 0;
    const content = `
      <div class="cw-chat">
        <h3>Standard Test</h3>
        <p><b>Pool:</b> ${attr.toUpperCase()} (${aVal}) + ${skill} (${sVal}) − Wounds (${Math.abs(wound)}) = <b>${dice}</b> d10</p>
        <p><b>Faces:</b> ${faces.join(", ")} ${specialized ? "(10-again)" : ""}</p>
        <p><b>Successes (7–10):</b> ${successes}${botch ? " — <span class='botch'>BOTCH</span>" : ""}</p>
      </div>`;
    roll.toMessage({ speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: content });
  }
}
Hooks.once("init", () => {
  console.log("Colonial Weather | Initializing");
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("colonial-weather", CWActorSheet, { makeDefault: true });
  Handlebars.registerHelper("uppercase", str => String(str).toUpperCase());
  Handlebars.registerHelper("capitalize", str => String(str).replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()));
});
