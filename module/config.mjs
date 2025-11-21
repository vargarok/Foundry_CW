export const CW = {};

CW.attributes = {
  physical: ["str", "dex", "sta"],
  social: ["cha", "soc", "app"],
  mental: ["int", "edu", "wit"]
};

// From Character Creation PDF
CW.skills = {
  athletics: "Athletics",
  awareness: "Awareness",
  brawl: "Brawl",
  business: "Business",
  computer: "Computer Use",
  demolitions: "Demolitions",
  disguise: "Disguise",
  drive: "Drive",
  empathy: "Empathy",
  engineering: "Engineering",
  etiquette: "Etiquette",
  firearms: "Firearms",
  forgery: "Forgery",
  gambling: "Gambling",
  gatherInfo: "Gather Information",
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
  politics: "Politics",
  repair: "Repair",
  security: "Security",
  stealth: "Stealth",
  streetwise: "Streetwise",
  subterfuge: "Subterfuge",
  survival: "Survival",
  technology: "Technology"
};

// From Character Creation PDF
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

// Health Levels with Penalties
CW.healthLevels = [
  { label: "Bruised", penalty: 0 },
  { label: "Hurt", penalty: -1 },
  { label: "Injured", penalty: -1 },
  { label: "Wounded", penalty: -2 },
  { label: "Mauled", penalty: -2 },
  { label: "Crippled", penalty: -5 },
  { label: "Incapacitated", penalty: 99 }
];