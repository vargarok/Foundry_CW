export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([
    "systems/colonial-weather/templates/actor/parts/header.hbs",
    "systems/colonial-weather/templates/actor/parts/attributes.hbs",
    "systems/colonial-weather/templates/actor/parts/skills.hbs",
    "systems/colonial-weather/templates/actor/parts/bio.hbs"
  ]);
};