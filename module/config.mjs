export const CW = {};

CW.attributes = {
  physical: ["str", "dex", "sta"],
  social: ["cha", "soc", "app"],
  mental: ["int", "edu", "wit"]
};

// Expanded skill definitions with default attributes
CW.skills = {
  athletics: { label: "Athletics", attr: "str" },
  awareness: { label: "Awareness", attr: "wit" },
  brawl: { label: "Brawl", attr: "str" },
  business: { label: "Business", attr: "soc" },
  computer: { label: "Computer Use", attr: "int" },
  demolitions: { label: "Demolitions", attr: "int" },
  disguise: { label: "Disguise", attr: "app" },
  drive: { label: "Drive", attr: "dex" },
  empathy: { label: "Empathy", attr: "cha" },
  engineering: { label: "Engineering", attr: "int" },
  etiquette: { label: "Etiquette", attr: "soc" },
  firearms: { label: "Firearms", attr: "dex" },
  forgery: { label: "Forgery", attr: "int" },
  gambling: { label: "Gambling", attr: "wit" },
  gatherInfo: { label: "Gather Information", attr: "cha" },
  heavyWeapons: { label: "Heavy Weapons", attr: "dex" },
  intimidate: { label: "Intimidate", attr: "str" },
  leadership: { label: "Leadership", attr: "cha" },
  linguistics: { label: "Linguistics", attr: "edu" },
  martialArts: { label: "Martial Arts", attr: "dex" },
  medicine: { label: "Medicine", attr: "edu" },
  melee: { label: "Melee", attr: "dex" },
  navigation: { label: "Navigation", attr: "int" },
  perform: { label: "Perform", attr: "app" },
  pilot: { label: "Pilot", attr: "dex" },
  politics: { label: "Politics", attr: "soc" },
  repair: { label: "Repair", attr: "dex" },
  security: { label: "Security", attr: "wit" },
  stealth: { label: "Stealth", attr: "dex" },
  streetwise: { label: "Streetwise", attr: "wit" },
  subterfuge: { label: "Subterfuge", attr: "cha" },
  survival: { label: "Survival", attr: "sta" },
  technology: { label: "Technology", attr: "edu" }
};

CW.backgrounds = {
  allies: "Allies",
  armoury: "Armoury",
  alternateID: "Alternate ID",
  backing: "Backing",
  cipher: "Cipher",
  contacts: "Contacts",
  cybernetics: "Cybernetics",
  enemies: "Enemies",
  equipment: "Equipment",
  favours: "Favours",
  fame: "Fame/Infamy",
  followers: "Followers",
  influence: "Influence",
  mentor: "Mentor",
  network: "Network",
  resources: "Resources",
  sanctum: "Sanctum",
  security: "Security",
  soldiers: "Soldiers",
  spies: "Spies",
  staff: "Staff",
  status: "Status"
};

CW.healthLevels = [
  { label: "Bruised", penalty: 0 },
  { label: "Hurt", penalty: -1 },
  { label: "Injured", penalty: -1 },
  { label: "Wounded", penalty: -2 },
  { label: "Mauled", penalty: -2 },
  { label: "Crippled", penalty: -5 },
  { label: "Incapacitated", penalty: 99 }
];