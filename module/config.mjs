export const CW = {};

CW.attributes = {
  physical: ["str", "dex", "sta"],
  social: ["cha", "soc", "app"],
  mental: ["int", "edu", "wit"]
};

// Define specific labels for physical attributes
CW.attributeLabels = {
  str: "Strength",
  dex: "Dexterity",
  sta: "Stamina",
  cha: "Charisma",
  soc: "Social",
  app: "Appearance",
  int: "Intelligence",
  edu: "Education",
  wit: "Wits"
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

CW.healthLevels = {
    0: { label: "Bruised", penalty: 0 },
    1: { label: "Injured", penalty: -1 },
    2: { label: "Wounded", penalty: -1 },
    3: { label: "Hurt", penalty: -2 },
    4: { label: "Mauled", penalty: -2 },
    5: { label: "Crippled", penalty: -5 },
    6: { label: "Incapacitated", penalty: 99 } // 99 indicates unable to act
};

CW.damageTypes = {
  bashing: "Bashing",
  lethal: "Lethal",
  aggravated: "Aggravated"
};

CW.armorLocations = {
  head: "Head",
  chest: "Chest",
  stomach: "Stomach",
  rArm: "Right Arm",
  lArm: "Left Arm",
  rLeg: "Right Leg",
  lLeg: "Left Leg"
};

CW.effectOptions = {
      attributes: {
        label: "--- ATTRIBUTES ---",
        items: {
            "system.attributes.str.value": "Strength",
            "system.attributes.dex.value": "Dexterity",
            "system.attributes.sta.value": "Stamina",
            "system.attributes.cha.value": "Charisma",
            "system.attributes.soc.value": "Social",
            "system.attributes.app.value": "Appearance",
            "system.attributes.int.value": "Intelligence",
            "system.attributes.edu.value": "Education",
            "system.attributes.wit.value": "Wits"
        }
      },
    
      derived: {
        label: "--- DERIVED STATS ---",
        items: {
            "system.derived.initBonus": "Initiative Bonus",
            "system.derived.moveBonus": "Movement Bonus",
            "system.health.bonusLevels": "Health Levels (Boxes)",
            "system.health.total.bonus": "Total Hit Points (Bonus)"
        }
    },
      combat: {
        label: "--- COMBAT ---",
        items: {
            "system.health.locations.head.max": "Max HP: Head",
            "system.health.locations.chest.max": "Max HP: Chest",
            "system.health.locations.stomach.max": "Max HP: Stomach",
            "system.health.locations.rArm.max": "Max HP: R-Arm",
            "system.health.locations.lArm.max": "Max HP: L-Arm",
            "system.health.locations.rLeg.max": "Max HP: R-Leg",
            "system.health.locations.lLeg.max": "Max HP: L-Leg"
        }
    },
      skills: {
        label: "--- SKILLS ---",
        items: {
            "system.skills.athletics.value": "Athletics",
            "system.skills.awareness.value": "Awareness",
            "system.skills.brawl.value": "Brawl",
            "system.skills.business.value": "Business",
            "system.skills.computer.value": "Computer Use",
            "system.skills.demolitions.value": "Demolitions",
            "system.skills.disguise.value": "Disguise",
            "system.skills.drive.value": "Drive",
            "system.skills.empathy.value": "Empathy",
            "system.skills.engineering.value": "Engineering",
            "system.skills.etiquette.value": "Etiquette",
            "system.skills.firearms.value": "Firearms",
            "system.skills.forgery.value": "Forgery",
            "system.skills.gambling.value": "Gambling",
            "system.skills.gatherInfo.value": "Gather Information",
            "system.skills.heavyWeapons.value": "Heavy Weapons",
            "system.skills.intimidate.value": "Intimidate",
            "system.skills.leadership.value": "Leadership",
            "system.skills.linguistics.value": "Linguistics",
            "system.skills.martialArts.value": "Martial Arts",
            "system.skills.medicine.value": "Medicine",
            "system.skills.melee.value": "Melee",
            "system.skills.navigation.value": "Navigation",
            "system.skills.perform.value": "Perform",
            "system.skills.pilot.value": "Pilot",
            "system.skills.politics.value": "Politics",
            "system.skills.repair.value": "Repair",
            "system.skills.security.value": "Security",
            "system.skills.stealth.value": "Stealth",
            "system.skills.streetwise.value": "Streetwise",
            "system.skills.subterfuge.value": "Subterfuge",
            "system.skills.survival.value": "Survival",
            "system.skills.technology.value": "Technology"
        }
    }
};

CW.gravityTypes = {
  "Zero": "Zero",
  "Low": "Low",
  "Normal": "Normal",
  "High": "High"
};

CW.healthStates = {
  0: "None",
  1: "Bashing",
  2: "Lethal",
  3: "Aggravated"
};

CW.creationLimits = {
    attributes: 15, // 7/5/3 simplified to a pool for now
    skills: 23,
    backgrounds: 7,
    freebies: 15
};

CW.freebieCosts = {
    attribute: 5,
    skill: 2,
    background: 1,
    willpower: 1,
    specialized: 1
};

CW.xpCosts = {
    newSkill: 3,
    raiseSkill: 2, // x current level
    raiseAttribute: 5, // x current level (Adjust based on your PDF preference)
    newWillpower: 1 // x current level
};